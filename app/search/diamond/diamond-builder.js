import EmberObject, { computed } from '@ember/object';
import DiamondRequest from './diamond-request';
import { getOwner } from '@ember/application';
import _ from 'lodash';

const SEARCH_TYPES = [
    'users',
    'groups' ,
    'locations',
    'messages'
];

const SORT_ORDER = [
    'ASC',
    'DESC',
    'SCORE'
];

const QUERY_TYPES = [
    'CONTAINS',
    'DATE_RANGE',
    'EXACT',
    'GREATER_THAN',
    'GREATER_THAN_EQUAL_TO',
    'LESS_THAN',
    'LESS_THAN_EQUAL_TO',
    'MATCH_ALL',
    'QUERY_STRING',
    'RANGE',
    'REQUIRED_FIELDS',
    'SIMPLE',
    'STARTS_WITH',
    'TERM',
    'TERMS'
];

const assertArray = function (valid, input, errorMessage) {
    if (!_.isArray(input)) {
        throw new Error('input must be in the form of an array');
    }

    const validTypes = _.intersection(valid, input);
    if (validTypes.length !== input.length) {
        const invalidTypes = _.difference(validTypes, types);
        throw new Error(`${errorMessage}: ${invalidTypes}`);
    }
};

export default EmberObject.extend({
    diamondUrl: null,
    sortOrder: null,
    sortBy: null,
    pageSize: null,
    expand: null,
    types: null,
    query: null,

    init() {
        this._super(...arguments);
        this.set('query', []);
    },

    setSortOrder(order) {
        if (!SORT_ORDER.includes(order)) {
            throw new Error(`You supplied an incorrect sort order: ${order}`);
        }

        this.set('sortOrder', order);
        return this;
    },

    setSortBy(sortBy) {
        if (!sortBy || sortBy.trim().length === 0) {
            throw new Error('You supplied an empty sortBy value');
        }

        this.set('sortBy', sortBy);
        return this;
    },

    setPageSize(size) {
        if (typeof parseInt(size) !== 'number') {
            throw new Error(`Page size must be a number but you supplied ${size}`);
        }

        this.set('pageSize', size);
        return this;
    },

    setExpansions(expansions) {
        if (!_.isArray(expansions)) {
            throw new Error('input must be in the form of an array');
        }

        this.set('expand', expansions);
        return this;
    },

    setTypes(types) {
        assertArray(SEARCH_TYPES, types, 'You supplied the following invalid types');

        this.set('types', types);
        return this;
    },

    setQuery(query) {
        if (!_.isArray(query)) {
            throw new Error('Queries must be in the form on an array');
        }

        //TODO: Try and validate the query in the future
        this.set('query', query);
        return this;
    },

    build() {
        const sortOrder = this.get('sortOrder') || 'ASC';
        const sortBy = this.get('sortBy');
        const pageSize = this.get('pageSize') || 25;
        const expand = this.get('expand');
        const types = this.get('types') || SEARCH_TYPES;
        const query = this.get('query');
        const url = this.get('diamondUrl');

        if (this.get('query.length') === 0){
            throw new Error('Attempted to build diamond request without a query');
        }

        return DiamondRequest.create({ sortOrder, sortBy, pageSize, expand, types, query, url }, getOwner(this).ownerInjection());
    }
});
