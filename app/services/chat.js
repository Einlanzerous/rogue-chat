import { inject as service } from '@ember/service';
import { getOwner } from '@ember/application';
import MessageModel from '../models/message';
import ChatRoom from '../models/chat-room';
import { bind } from '@ember/runloop';
import Service from '@ember/service';
import moment from 'moment';
import RSVP from 'rsvp';
import _ from 'lodash';

export default Service.extend({
    history: service(),
    session: service(),
    router: service(),
    store: service(),
    ipc: service(),

    /**
     * We keep a cache of the rooms and array as well. The cache is used for all rooms this
     * window has ever seen and the array is all the current open rooms. The cache allows us to reopen
     * rooms quickly without all the setup if the user chooses to open the room again.
     */
    rooms: null,
    roomCache: null,
    openRoomHandler: null,
    activeInteraction: null,

    init() {
        this._super(...arguments);
        this.set('roomCache', {});
        this.set('rooms', []);
    },

    willDestroy() {
        this.get('ipc').removeListener('open-room', this.openRoomHandler);
        this.openRoomHandler = null;
    },

    bindToEvents() {
        this.openRoomHandler = bind(this, this.openRoomEvent);
        this.get('ipc').registerListener('open-room', this.openRoomHandler);
    },

    openRoomEvent(event, message) {
        this.get('router').transitionTo('chat.room', message.jid, {
            queryParams: {
                rawSubject: message.rawSubject
            }
        });
    },

    closeInteraction(room) {
        this.get('rooms').removeObject(room);
        const nextInteraction = this.get('rooms.lastObject');
        if (nextInteraction) {
            this.get('router').transitionTo('chat.room', nextInteraction.get('jid'));
        } else {
            this.get('ipc').sendEvent('close-window');
        }
    },

    async getChatRoom(jid) {
        const roomId = _.first(jid.split('@'));
        let room = this.get(`roomCache.${roomId}`);
        if (!room) {
            room = ChatRoom.create({id: roomId, jid}, getOwner(this).ownerInjection());
            await this.setupRoom(room);
            this.set(`roomCache.${roomId}`, room);
        }
        return room;
    },

    async setupRoom(room) {
        this.setupRoomBindings(room);
        await this.loadEntityData(room);
        await this.activateRoom(room);
    },

    async loadEntityData(room) {
        const type = room.get('type');

        let entity;
        if (type === 'person') {
            entity = await this.get('store').findRecord('user', room.get('jid'));
        } else if (type === 'group') {
            entity = await this.get('store').findRecord('group', room.get('jid'));
        }
        room.set('entity', entity);
    },

    setupRoomBindings(room) {
        const messageHandler = room.messageHandler.bind(room);
        const scopedMessageTopic = `message:${room.get('id')}`;
        this.get('ipc').registerListener(scopedMessageTopic, async (event, message) => {
            message = await this.setupMessageModel(message, 'x');
            messageHandler(message);
        });

        const scopedOccupantTopic = `occupant:${room.get('id')}`;
        this.get('ipc').registerListener(scopedOccupantTopic, async (event, {from, type}) => {
            const occupant = await this.get('store').findRecord('user', from);
            room.occupantHandler(type, occupant);
        });
    },

    async setupMessageModel(realtimeMessage, timestampFormat) {
        const message = MessageModel.create(realtimeMessage, getOwner(this).ownerInjection());

        //search message come with the user pre-fetched, no need to fetch it again
        if (realtimeMessage.from) {
            const user = await this.get('store').findRecord('user', realtimeMessage.from);
            message.set('user', user);
        }
        message.set('time', moment(realtimeMessage.time, timestampFormat));

        return message;
    },

    joinRoom(room) {
        return new Promise((resolve, reject) => {
            // Create a timeout just in case we don't get a response from realtime
            const tid = setTimeout(() => {
                reject(new Error('Never received a join room response from realtime'));
            }, 5000);

            const scopedJoinTopic = `join:${room.get('id')}`;
            this.get('ipc').registerOneTimeListener(scopedJoinTopic, () => {
                clearTimeout(tid);
                room.set('activated', true);
                resolve();
            });
            this.get('ipc').sendEvent('join-room', {
                id: room.get('id'),
                payload: room.get('jid')
            });
        });
    },

    inviteToRoom(room, inviteeJid) {
        // realtime doesn't provide a callback for invites
        this.get('ipc').sendEvent('invite-to-room', {
            id: room.get('id'),
            payload: {
                roomJid: room.get('jid'),
                userJid: inviteeJid
            }
        });
    },

    getRoomInfo(room) {
        return new RSVP.Promise((resolve, reject) => {
            const tid = setTimeout(() => {
                reject(new Error('never received room info from realtime'));
            }, 5000);

            const scopedRoomInfo = `room-info:${room.get('id')}`;
            this.get('ipc').registerOneTimeListener(scopedRoomInfo, (event, roomInfo) => {
                clearTimeout(tid);
                resolve(roomInfo);
            });

            this.get('ipc').sendEvent('get-room-info', {
                id: room.get('id'),
                payload: room.get('jid')
            });
        })
    },

    sendMessage(room, message, options = {}) {
        return new RSVP.Promise((resolve, reject) => {
            const tid = setTimeout(() => {
               reject(new Error('never received carbon response from realtime'));
            }, 5000);

            const scopedSendMessage = `send-message:${room.get('id')}`;
            this.get('ipc').registerOneTimeListener(scopedSendMessage, (event, message) => {
                clearTimeout(tid);
                room.updatePendingMessage(message);
                resolve();
            });

            this.get('ipc').sendEvent('send-message', {
                id: room.get('id'),
                payload: {
                    to: room.get('jid'),
                    body: message,
                    children: options.children
                }
            });
        }) ;
    },

    async activateRoom(room) {
        if (!room.get('activated')) {
            if (room.get('type') !== 'person') {
                await this.joinRoom(room);

                const roomInfo = await this.getRoomInfo(room);
                room.set('rawSubject', roomInfo.subject);
            }
            await this.get('history').loadHistoryBefore(room);
            room.set('activated', true);
        }
    }
});
