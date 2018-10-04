import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';

export default Route.extend({
    session: service(),

    beforeModel() {
       return this.get('session').authenticate()
    }
});
