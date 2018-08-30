import { emojiParse } from 'ember-emoji/helpers/emoji-parse';
import { markdownToHTML } from './../utils/markdown'
import { computed } from '@ember/object';
import EmberObject from '@ember/object';

export default EmberObject.extend({
    //properties from realtime
    id: null,
    oid: null,
    from: null,
    to: null,
    time: null,
    corrects: null,
    raw: null,
    links: null,
    stanza: null,
    files: null,

    //properties create when the message is received in chat
    user: null,

    //set by history service when message is received
    history: false,

    //overridden by chat model when processing messages
    correctionRaw: null,
    startOfBlock: true,
    endOfBlock: true,

    message: computed('raw', 'correctionRaw', function () {
        return this.get('correctionRaw') || this.get('raw');
    }),

    markdown: computed('message', function () {
       const markdown = markdownToHTML(this.get('message'));
       return emojiParse([markdown]);
    }),

    corrected: computed('correctionRaw', 'corrects', function () {
       return !!(this.get('correctionRaw') || this.get('corrects'));
    })
});
