import {isGroupJid, isPersonJid} from "../utils/jid-helpers";
import { computed } from '@ember/object';
import EmberObject from '@ember/object';

export default EmberObject.extend({
    id: null,
    jid: null,
    rawSubject: null,
    entity: null,

    type: computed('jid', function () {
        const jid = this.get('jid');
        return isPersonJid(jid) ? 'person' : isGroupJid(jid) ? 'group' : 'adhoc';
    }),

    subject: computed('entity', 'rawSubject', function () {
        return this.get('entity.name') || this.get('rawSubject');
    }),

    handleMessage(event, message) {
        console.log("message: ", message);
    }
});
