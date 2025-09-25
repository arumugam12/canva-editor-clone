import React from 'react';
import ReactDOM from 'react-dom/client';
import Test from './Test';

const rootEl = document.getElementById('root') as HTMLElement;
ReactDOM.createRoot(rootEl).render(
	<React.StrictMode>
		<Test />
	</React.StrictMode>
);
