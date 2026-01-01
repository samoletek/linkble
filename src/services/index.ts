// Auth service
export {
  signUp,
  signIn,
  signOut,
  resetPassword,
  updatePassword,
  getSession,
  getCurrentUser,
  onAuthStateChange,
  getProfile,
  getCurrentProfile,
  updateProfile,
  uploadAvatar,
  deleteAccount,
  type SignUpData,
  type SignInData,
  type AuthResult,
} from './auth';

// Events service
export {
  getCategories,
  getNearbyEvents,
  getEventsByCategory,
  getEvent,
  getUserEvents,
  createEvent,
  updateEvent,
  cancelEvent,
  requestToJoin,
  respondToRequest,
  leaveEvent,
  kickParticipant,
  getEventParticipants,
  getPendingRequests,
} from './events';

// Messages service
export {
  getEventMessages,
  sendEventMessage,
  pinMessage,
  deleteMessage,
  getConversations,
  getOrCreateConversation,
  getDirectMessages,
  sendDirectMessage,
  deleteDirectMessage,
  subscribeToEventMessages,
  subscribeToDirectMessages,
  subscribeToConversations,
  unsubscribe,
} from './messages';

// Users service
export {
  getBlockedUsers,
  blockUser,
  unblockUser,
  isUserBlocked,
  isBlockedByUser,
  type BlockedUserWithProfile,
} from './users';

// Notifications service
export {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from './notifications';
