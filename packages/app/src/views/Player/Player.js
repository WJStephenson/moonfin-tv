import {getPlatform} from '../../platform';
import {lazy, Suspense} from 'react';

const PlatformPlayer = lazy(() =>
	getPlatform() === 'tizen'
		? import('@moonfin/platform-tizen/views/Player')
		: import('@moonfin/platform-webos/views/Player')
);

const Player = (props) => (
	<Suspense fallback={null}>
		<PlatformPlayer {...props} />
	</Suspense>
);

export default Player;
