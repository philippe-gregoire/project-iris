import { combineReducers } from 'redux'
import accountsReducer from './accounts'
import resourcesReducer from './resources'
import profileReducer from './profile'
import bucketsReducer from './buckets'
import collectionReducer from './collection'

export default combineReducers({
  accounts: accountsReducer,
  resources: resourcesReducer,
  profile: profileReducer,
  buckets: bucketsReducer,
  collection: collectionReducer
})
