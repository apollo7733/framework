import { createStore, bindActionCreators, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { takeEvery } from 'redux-saga/effects';

const keys = [];
const modules = [];

const registerModule = (m)=>{
	if(!m.stateKey)
	{
		throw new Error(`模块没有定义stateKey`);
	}
	if(!m.initState)
	{
		throw new Error(`模块${m.stateKey}没有定义initState`);
	}
	if(!m.Actions)
	{
		throw new Error(`模块${m.stateKey}没有定义Actions`);
	}
	modules.push(m);
	keys.push(m.stateKey);
	return m;
}

const actions = {}; //bind的actions,如果不需要actions,可以不bindActionCreators

// 不使用combineReducers,提供默认的defaultReducer,仿照combineReducers,可以单独的对每个模块进行reducer
const defaultReducer=(state,action)=>
{		
	let hasChanged = false;
	const nextState = {actions}; //如果state没有bindActions,则加上bindActions(如果直接使用this.props.dispatch,可以不需要设置actions)
	//仿照redux的combineReducers进行处理
	keys.forEach(key=>{ 
		const previousStateForKey = state[key];
		const nextStateForKey = action.reducer?action.reducer(previousStateForKey,action):previousStateForKey;
		nextState[key] = nextStateForKey;
		hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
	});	
	if(!hasChanged && !state.actions) //如果不需要bindActions,可以去掉
	{
		nextState.actions = actions;
		hasChanged = true;
	}
	return hasChanged ? nextState : state;
}

const initStore = ()=>{	
	const originalState = {}; //初始state状态,如不需要bindCreator,可以不设置actions
	modules.forEach(m=>{originalState[m.stateKey] = m.initState});
	const sagaMiddleware = createSagaMiddleware(); //创建saga中间件	
	const store = createStore(defaultReducer,originalState,applyMiddleware(sagaMiddleware)); //创建redux-store
	function *sagaAction(action) {if(action.saga){yield action.saga(action);}} //默认的saga函数
	sagaMiddleware.run(function* () { yield takeEvery('*', sagaAction);}); //运行saga线程		
	modules.forEach(m=>{Object.assign(actions,bindActionCreators(m.Actions, store.dispatch))}); //bind具体的action,也可以不绑定，直接通过dispatch进行访问
	return {store};
}

export {registerModule,initStore}