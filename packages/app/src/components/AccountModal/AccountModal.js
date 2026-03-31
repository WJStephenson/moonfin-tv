import {useCallback, useState, useEffect} from 'react';
import Spottable from '@enact/spotlight/Spottable';
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator';
import Popup from '@enact/sandstone/Popup';
import {useAuth} from '../../context/AuthContext';
import {useSettings} from '../../context/SettingsContext';
import * as connectionPool from '../../services/connectionPool';
import {parseUrl} from '../../utils/urlCompat';
import {getImageUrl, getBackdropId, getPrimaryImageId} from '../../utils/helpers';

import css from './AccountModal.module.less';

const SpottableButton = Spottable('button');
const SpottableDiv = Spottable('div');
const ProfileRow = SpotlightContainerDecorator({enterTo: 'last-focused', restrict: 'self-first'}, 'div');

const getItemServerUrl = (item, fallback) => item?._serverUrl || fallback;

const getBackdropUrlForItem = (item, serverUrl) => {
	if (!item) return null;
	const su = getItemServerUrl(item, serverUrl);
	const bid = getBackdropId(item);
	if (bid) {
		return getImageUrl(su, bid, 'Backdrop', {maxWidth: 1920, quality: 85});
	}
	const pid = getPrimaryImageId(item);
	if (pid) {
		return getImageUrl(su, pid, 'Primary', {maxWidth: 1920, quality: 85});
	}
	return null;
};

const AccountModal = ({
	open,
	onClose,
	onLogout,
	onAddServer,
	onAddUser,
	onAccountSwitched
}) => {
	const {
		api,
		serverUrl,
		hasMultipleServers,
		logout,
		logoutAll,
		servers,
		activeServerInfo,
		switchUser,
		removeUser,
		startAddServerFlow
	} = useAuth();
	const {settings} = useSettings();
	const unifiedMode = settings.unifiedLibraryMode && hasMultipleServers;

	const [showConfirmRemove, setShowConfirmRemove] = useState(false);
	const [serverToRemove, setServerToRemove] = useState(null);
	const [editMode, setEditMode] = useState(false);
	const [backdropItem, setBackdropItem] = useState(null);

	const blurPx = settings.backdropBlurDetail > 0 ? settings.backdropBlurDetail : 24;

	useEffect(() => {
		if (!open) {
			setBackdropItem(null);
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				let items = [];
				if (unifiedMode) {
					items = await connectionPool.getRandomItemsFromAllServers('both', 8);
				} else if (api) {
					const res = await api.getRandomItems('both', 8);
					items = res.Items || [];
				}
				const withBackdrop = items.find((i) => getBackdropId(i) || getPrimaryImageId(i));
				if (!cancelled) {
					setBackdropItem(withBackdrop || items[0] || null);
				}
			} catch {
				if (!cancelled) setBackdropItem(null);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [open, unifiedMode, api]);

	const backdropUrl = getBackdropUrlForItem(backdropItem, serverUrl);

	const handleLogout = useCallback(async () => {
		await logout();
		onClose?.();
		onLogout?.();
	}, [logout, onClose, onLogout]);

	const handleLogoutAll = useCallback(async () => {
		await logoutAll();
		onClose?.();
		onLogout?.();
	}, [logoutAll, onClose, onLogout]);

	const handleAddUser = useCallback(() => {
		setEditMode(false);
		onClose?.();
		onAddUser?.();
	}, [onClose, onAddUser]);

	const handleAddServer = useCallback(() => {
		setEditMode(false);
		startAddServerFlow();
		onClose?.();
		onAddServer?.();
	}, [startAddServerFlow, onClose, onAddServer]);

	const handleProfileActivate = useCallback(async (e) => {
		const serverId = e.currentTarget.dataset.serverId;
		const userId = e.currentTarget.dataset.userId;
		if (!serverId || !userId) return;

		const isActive = activeServerInfo?.serverId === serverId && activeServerInfo?.userId === userId;

		if (editMode) {
			if (isActive) return;
			const entry = servers.find(s => s.serverId === serverId && s.userId === userId);
			if (entry) {
				setServerToRemove({
					serverId,
					userId,
					username: entry.username,
					serverName: entry.name
				});
				setShowConfirmRemove(true);
			}
			return;
		}

		if (!isActive) {
			await switchUser(serverId, userId);
			onClose?.();
			onAccountSwitched?.();
		}
	}, [activeServerInfo, editMode, servers, switchUser, onClose, onAccountSwitched]);

	const handleConfirmRemove = useCallback(async () => {
		if (!serverToRemove) return;
		const success = await removeUser(serverToRemove.serverId, serverToRemove.userId);
		if (success) {
			setShowConfirmRemove(false);
			setServerToRemove(null);
		}
	}, [serverToRemove, removeUser]);

	const handleCancelRemove = useCallback(() => {
		setShowConfirmRemove(false);
		setServerToRemove(null);
	}, []);

	const toggleEdit = useCallback(() => {
		setEditMode(v => !v);
	}, []);

	const profileImageUrl = (entry) => {
		if (entry.primaryImageTag) {
			return `${entry.url}/Users/${entry.userId}/Images/Primary?tag=${entry.primaryImageTag}&quality=90&maxHeight=480`;
		}
		return null;
	};

	if (!open) return null;

	return (
		<>
			<div className={css.overlay}>
				<div className={css.backdropLayer} aria-hidden>
					{backdropUrl && (
						<img
							src={backdropUrl}
							alt=""
							className={css.backdropImage}
							style={blurPx > 0 ? {filter: `blur(${blurPx}px)`, WebkitFilter: `blur(${blurPx}px)`} : undefined}
						/>
					)}
				</div>
				<div className={css.backdropGradient} />

				<div className={css.shell}>
					<div className={css.header}>
						<h2 className={css.heading}>Who&apos;s watching?</h2>
						<div className={css.headerActions}>
							<SpottableButton
								type="button"
								className={`${css.textBtn} ${editMode ? css.textBtnOn : ''}`}
								onClick={toggleEdit}
								spotlightId="account-edit-profiles"
							>
								{editMode ? 'Done' : 'Edit'}
							</SpottableButton>
							<SpottableButton className={css.closeBtn} onClick={onClose} spotlightId="account-close">
								<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
									<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
								</svg>
							</SpottableButton>
						</div>
					</div>

					<div className={css.posterStage}>
						<ProfileRow className={css.posterRow}>
							{servers.map((entry, index) => {
								const isActive = activeServerInfo?.serverId === entry.serverId &&
									activeServerInfo?.userId === entry.userId;
								let host = entry.url;
								try {
									host = parseUrl(entry.url).hostname;
								} catch (e) { /* keep raw */ }
								const img = profileImageUrl(entry);
								return (
									<SpottableDiv
										key={`${entry.serverId}-${entry.userId}`}
										className={`${css.posterTile} ${isActive ? css.posterTileActive : ''}`}
										data-server-id={entry.serverId}
										data-user-id={entry.userId}
										onClick={handleProfileActivate}
										spotlightId={`account-profile-${index}`}
									>
										<div className={css.posterFrame}>
											{img ? (
												<img src={img} alt="" className={css.posterImg} />
											) : (
												<div className={css.posterFallback}>
													{entry.username?.charAt(0)?.toUpperCase() || '?'}
												</div>
											)}
											{editMode && !isActive && (
												<div className={css.removeBadge} aria-hidden>×</div>
											)}
										</div>
										<span className={css.posterName}>{entry.username}</span>
										<span className={css.posterHost}>{host}</span>
									</SpottableDiv>
								);
							})}

							<SpottableDiv
								className={css.posterTile}
								onClick={handleAddUser}
								spotlightId="account-add-profile"
							>
								<div className={`${css.posterFrame} ${css.posterFrameAdd}`}>
									<span className={css.addPlus}>+</span>
								</div>
								<span className={css.posterName}>Add profile</span>
							</SpottableDiv>
						</ProfileRow>
					</div>

					{editMode && (
						<p className={css.editHint}>Choose a profile to remove from this device.</p>
					)}

					<div className={css.footerBar}>
						<SpottableButton className={css.footerBtn} onClick={handleAddServer} spotlightId="account-change-server">
							Change server
						</SpottableButton>
						<SpottableButton className={css.footerBtn} onClick={handleLogout} spotlightId="account-logout">
							Sign out
						</SpottableButton>
						{servers.length > 1 && (
							<SpottableButton
								className={`${css.footerBtn} ${css.footerBtnDanger}`}
								onClick={handleLogoutAll}
								spotlightId="account-logout-all"
							>
								Sign out everyone
							</SpottableButton>
						)}
					</div>
				</div>
			</div>

			{showConfirmRemove && serverToRemove && (
				<Popup
					open={showConfirmRemove}
					onClose={handleCancelRemove}
					position="center"
					scrimType="translucent"
					noAutoDismiss
				>
					<div className={css.confirmModal}>
						<h2 className={css.confirmTitle}>Remove profile?</h2>
						<p className={css.confirmText}>
							Remove <strong>{serverToRemove.username}</strong> from this device
							({serverToRemove.serverName})? You can add this account again later.
						</p>
						<div className={css.confirmButtons}>
							<SpottableButton
								type="button"
								className={css.confirmBtn}
								onClick={handleCancelRemove}
								spotlightId="account-cancel-remove"
							>
								Cancel
							</SpottableButton>
							<SpottableButton
								type="button"
								className={`${css.confirmBtn} ${css.confirmBtnDanger}`}
								onClick={handleConfirmRemove}
								spotlightId="account-confirm-remove"
							>
								Remove
							</SpottableButton>
						</div>
					</div>
				</Popup>
			)}
		</>
	);
};

export default AccountModal;
