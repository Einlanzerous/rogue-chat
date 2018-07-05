import DS from 'ember-data';

const { attr } = DS;

export default DS.Model.extend({
    divisionId: attr(),
    username: attr(),
    displayName: attr(),
    name: attr(),
    title: attr(),
    organizationId: attr(),
    chat: attr(),
    images: attr(),
    manager: attr(),
    email: attr(),
    externalId: attr(),
    version: attr(),
    department: attr()
});
