import { combineReducers } from 'redux';
import defaultReducer, { initialState as defaultInitialState } from './default-reducer';

const rootReducer = combineReducers({
  default: defaultReducer,
});

export default rootReducer;

export interface TState {
  default: typeof defaultInitialState;
}
