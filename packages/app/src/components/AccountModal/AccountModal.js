import {useCallback, useState, useEffect, useRef} from 'react';
import Spottable from '@enact/spotlight/Spottable';
import Spotlight from '@enact/spotlight';
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator';
import Scroller from '@enact/sandstone/Scroller';
import Popup from '@enact/sandstone/Popup';
import {useAuth} from '../../context/AuthContext';
import {useSettings} from '../../context/SettingsContext';
import * as connectionPool from '../../services/connectionPool';
import {parseUrl} from '../../utils/urlCompat';
import {getImageUrl, getBackdropId, getPrimaryImageId} from '../../utils/helpers';

import css from './AccountModal.module.less';

const AccountDialogContainer = SpotlightContainerDecorator({
	enterTo: 'default-element',
	defaultElement: '.spottable-default',
	restrict: 'self-only',
	leaveFor: {left: '', right: '', up: '', down: ''}
}, 'div');

const ProfileList = SpotlightContainerDecorator({
	enterTo: 'last-focused',
	restrict: 'self-first'
}, 'ul');

const SpottableButton = Spottable('button');

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
	backConsumerRef,
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
	const prevConfirmOpenRef = useRef(false);

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

	useEffect(() => {
		if (!open) return;
		const t = setTimeout(() => {
			const activeIdx = servers.findIndex(
				(s) => s.serverId === activeServerInfo?.serverId && s.userId === activeServerInfo?.userId
			);
			if (activeIdx >= 0) {
				Spotlight.focus(`account-profile-${activeIdx}`);
			} else if (servers.length > 0) {
				Spotlight.focus('account-profile-0');
			} else {
				Spotlight.focus('account-add-profile');
			}
		}, 100);
		return () => clearTimeout(t);
	}, [open, servers, activeServerInfo]);

	useEffect(() => {
		if (!showConfirmRemove) return;
		const t = setTimeout(() => Spotlight.focus('account-cancel-remove'), 100);
		return () => clearTimeout(t);
	}, [showConfirmRemove]);

	useEffect(() => {
		if (!open) {
			prevConfirmOpenRef.current = false;
			return;
		}
		const wasOpen = prevConfirmOpenRef.current;
		prevConfirmOpenRef.current = showConfirmRemove;
		if (showConfirmRemove || !wasOpen) return;
		const t = setTimeout(() => Spotlight.focus('account-switcher-dialog'), 80);
		return () => clearTimeout(t);
	}, [open, showConfirmRemove]);

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

	const handleCancelRemove = useCallback(() => {
		setShowConfirmRemove(false);
		setServerToRemove(null);
	}, []);

	useEffect(() => {
		if (!backConsumerRef) return;
		if (!open) {
			backConsumerRef.current = null;
			return;
		}
		backConsumerRef.current = () => {
			if (showConfirmRemove) {
				handleCancelRemove();
				return true;
			}
			return false;
		};
		return () => {
			backConsumerRef.current = null;
		};
	}, [open, showConfirmRemove, backConsumerRef, handleCancelRemove]);

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
				<div className={css.backdropLayer} aria-hidden="true">
					{backdropUrl && (
						<img
							src={backdropUrl}
							alt=""
							className={css.backdropImage}
							style={blurPx > 0 ? {filter: `blur(${blurPx}px)`, WebkitFilter: `blur(${blurPx}px)`} : undefined}
						/>
					)}
				</div>
				<div className={css.backdropGradient} aria-hidden="true" />

				<AccountDialogContainer
					className={css.shell}
					role="dialog"
					aria-modal="true"
					aria-labelledby="account-switcher-title"
					spotlightId="account-switcher-dialog"
				>
					<header className={css.header}>
						<h1 id="account-switcher-title" className={css.heading}>
							Who&apos;s watching?
						</h1>
						<div className={css.headerActions}>
							<SpottableButton
								type="button"
								className={`${css.textBtn} ${editMode ? css.textBtnOn : ''}`}
								onClick={toggleEdit}
								spotlightId="account-edit-profiles"
								aria-pressed={editMode}
								aria-label={editMode ? 'Done editing profiles' : 'Edit profiles'}
							>
								{editMode ? 'Done' : 'Edit'}
							</SpottableButton>
							<SpottableButton
								type="button"
								className={css.closeBtn}
								onClick={onClose}
								spotlightId="account-close"
								aria-label="Close profile switcher"
							>
								<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" aria-hidden="true" focusable="false">
									<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
								</svg>
							</SpottableButton>
						</div>
					</header>

					<div className={css.posterStage}>
						<Scroller
							className={css.profileScroller}
							direction="horizontal"
							horizontalScrollbar="hidden"
							verticalScrollbar="hidden"
						>
							<ProfileList className={css.posterRow} aria-label="Profiles">
								{servers.map((entry, index) => {
									const isActive = activeServerInfo?.serverId === entry.serverId &&
										activeServerInfo?.userId === entry.userId;
									let host = entry.url;
									try {
										host = parseUrl(entry.url).hostname;
									} catch {
										host = entry.url;
									}
									const img = profileImageUrl(entry);
									const labelParts = [
										entry.username,
										host,
										isActive ? 'current profile' : null,
										editMode && !isActive ? 'press to remove from this device' : null
									].filter(Boolean);
									const ariaLabel = labelParts.join(', ');
									return (
										<li key={`${entry.serverId}-${entry.userId}`} className={css.posterListItem}>
											<SpottableButton
												type="button"
												className={`${css.posterTile} ${isActive ? css.posterTileActive : ''} ${isActive ? 'spottable-default' : ''}`}
												data-server-id={entry.serverId}
												data-user-id={entry.userId}
												onClick={handleProfileActivate}
												spotlightId={`account-profile-${index}`}
												aria-label={ariaLabel}
												aria-current={isActive ? 'true' : undefined}
											>
												<span className={css.posterFrame}>
													{img ? (
														<img src={img} alt="" className={css.posterImg} />
													) : (
														<span className={css.posterFallback} aria-hidden="true">
															{entry.username?.charAt(0)?.toUpperCase() || '?'}
														</span>
													)}
													{editMode && !isActive && (
														<span className={css.removeBadge} aria-hidden="true">×</span>
													)}
												</span>
												<span className={css.posterName}>{entry.username}</span>
												<span className={css.posterHost}>{host}</span>
											</SpottableButton>
										</li>
									);
								})}

								<li className={css.posterListItem}>
									<SpottableButton
										type="button"
										className={`${css.posterTile} ${servers.length === 0 ? 'spottable-default' : ''}`}
										onClick={handleAddUser}
										spotlightId="account-add-profile"
										aria-label="Add profile"
									>
										<span className={`${css.posterFrame} ${css.posterFrameAdd}`} aria-hidden="true">
											<span className={css.addPlus}>+</span>
										</span>
										<span className={css.posterName}>Add profile</span>
									</SpottableButton>
								</li>
							</ProfileList>
						</Scroller>
					</div>

					{editMode && (
						<p className={css.editHint} role="status" aria-live="polite">
							Choose a profile to remove from this device.
						</p>
					)}

					<footer className={css.footerBar}>
						<SpottableButton type="button" className={css.footerBtn} onClick={handleAddServer} spotlightId="account-change-server">
							Change server
						</SpottableButton>
						<SpottableButton type="button" className={css.footerBtn} onClick={handleLogout} spotlightId="account-logout">
							Sign out
						</SpottableButton>
						{servers.length > 1 && (
							<SpottableButton
								type="button"
								className={`${css.footerBtn} ${css.footerBtnDanger}`}
								onClick={handleLogoutAll}
								spotlightId="account-logout-all"
								aria-label="Sign out everyone from this device"
							>
								Sign out everyone
							</SpottableButton>
						)}
					</footer>
				</AccountDialogContainer>
			</div>

			{showConfirmRemove && serverToRemove && (
				<Popup
					open={showConfirmRemove}
					onClose={handleCancelRemove}
					position="center"
					scrimType="translucent"
					noAutoDismiss
					spotlightRestrict="self-only"
				>
					<div className={css.confirmModal} role="alertdialog" aria-labelledby="account-remove-title" aria-describedby="account-remove-desc">
						<h2 id="account-remove-title" className={css.confirmTitle}>Remove profile?</h2>
						<p id="account-remove-desc" className={css.confirmText}>
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
