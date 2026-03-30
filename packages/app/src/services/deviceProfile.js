import {getPlatform} from '../platform';

let impl;

const loadImpl = async () => {
	if (impl) return impl;
	if (getPlatform() === 'tizen') {
		impl = await import('@moonfin/platform-tizen/deviceProfile');
	} else {
		impl = await import('@moonfin/platform-webos/deviceProfile');
	}
	return impl;
};

export const getDeviceCapabilities = async (...args) => {
	await loadImpl();
	return impl.getDeviceCapabilities(...args);
};

export const getJellyfinDeviceProfile = async (...args) => {
	await loadImpl();
	return impl.getJellyfinDeviceProfile(...args);
};

export const getH264FallbackProfile = async (...args) => {
	await loadImpl();
	return impl.getH264FallbackProfile ? impl.getH264FallbackProfile(...args) : impl.getJellyfinDeviceProfile(...args);
};

export const getDeviceId = (...args) => {
	if (!impl) {
		const id = localStorage.getItem('moonfinplus_device_id');
		if (id) return id;
		const newId = 'moonfinplus_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
		localStorage.setItem('moonfinplus_device_id', newId);
		return newId;
	}
	return impl.getDeviceId(...args);
};

export const getDeviceName = async (...args) => {
	await loadImpl();
	return impl.getDeviceName(...args);
};

export const clearCapabilitiesCache = () => {
	impl?.clearCapabilitiesCache?.();
};

export const detectPlatformVersion = async (...args) => {
	await loadImpl();
	if (getPlatform() === 'tizen') {
		return impl.detectTizenVersion?.(...args);
	}
	return impl.detectWebOSVersion?.(...args);
};
