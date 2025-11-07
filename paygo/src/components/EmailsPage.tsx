'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Mail, Clock, User, Paperclip, Star, Archive, Trash2, Search, LogOut, Download } from 'lucide-react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  url?: string; // This will now be populated from the backend
}

interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromEmail: string;
  date: string;
  snippet: string;
  body: string;
  isRead: boolean;
  hasAttachments: boolean;
  attachments: EmailAttachment[];
  labels: string[];
  isInvoice?: boolean;
  invoiceConfidence?: number;
}

interface EmailsResponse {
  emails: Email[];
  total: number;
  unreadCount: number;
}

interface GoogleTokenPayload {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

const EmailsContent: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all');
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('[EmailsPage] Checking auth status...');
      const response = await fetch('/api/auth/status', {
        credentials: 'include',
      });
      
      console.log('[EmailsPage] Auth status response:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[EmailsPage] Auth status data:', data);
        setIsAuthenticated(data.isAuthenticated);
        if (data.isAuthenticated && data.userEmail) {
          setUserEmail(data.userEmail);
          if (data.profile_uuid) {
            localStorage.setItem('user_uuid', data.profile_uuid);
          }
          console.log('[EmailsPage] User is authenticated, fetching emails...');
          fetchEmails();
        } else {
          console.log('[EmailsPage] User is NOT authenticated');
        }
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
    } finally {
      setCheckingAuth(false);
    }
  };

  // Handle Google OAuth success
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setLoading(true);
      setError(null);

      console.log('[EmailsPage] Google login success, credential received');
      const decoded = jwtDecode<GoogleTokenPayload>(credentialResponse.credential!);
      console.log('[EmailsPage] Decoded user:', decoded.email);
      
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          credential: credentialResponse.credential,
          email: decoded.email,
          name: decoded.name,
        }),
      });

      console.log('[EmailsPage] Auth response status:', response.status);

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      console.log('[EmailsPage] Auth response data:', data);

      if (data.requiresGmailAuth && data.authUrl) {
        console.log('[EmailsPage] Opening Gmail authorization popup...');
        // Open Gmail authorization in popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.authUrl,
          'Gmail Authorization',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Listen for messages from popup
        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'gmail-auth-success') {
            console.log('[EmailsPage] Gmail auth success message received');
            window.removeEventListener('message', handleMessage);
            if (popup && !popup.closed) {
              popup.close();
            }
            // Wait a bit for the session to be established, then check auth and fetch emails
            setTimeout(() => {
              console.log('[EmailsPage] Rechecking auth status after Gmail auth...');
              checkAuthStatus();
            }, 500);
          }
        };

        window.addEventListener('message', handleMessage);

        // Check if popup was closed without completing auth
        const checkClosed = setInterval(() => {
          if (popup && popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            console.log('[EmailsPage] Popup closed, rechecking auth...');
            checkAuthStatus();
          }
        }, 1000);
      } else if (data.success) {
        console.log('[EmailsPage] Authentication successful without Gmail popup');
        setIsAuthenticated(true);
        setUserEmail(decoded.email);
        fetchEmails();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to authenticate');
      console.error('Error during authentication:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth error
  const handleGoogleError = () => {
    setError('Failed to authenticate with Google');
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/disconnect', {
        method: 'POST',
        credentials: 'include',
      });
      
      setIsAuthenticated(false);
      setEmails([]);
      setSelectedEmail(null);
      setUnreadCount(0);
      setUserEmail('');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  // Fetch emails from backend
  const fetchEmails = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      console.log('[EmailsPage] Fetching emails...');
      const response = await fetch('/api/emails', {
        credentials: 'include',
      });

      console.log('[EmailsPage] Fetch emails response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('[EmailsPage] Session expired (401)');
          setIsAuthenticated(false);
          throw new Error('Session expired. Please login again.');
        }
        const errorText = await response.text();
        console.error('[EmailsPage] Fetch emails error:', errorText);
        throw new Error('Failed to fetch emails');
      }

      const data: EmailsResponse = await response.json();
      console.log('[EmailsPage] Received emails:', data.emails.length, 'emails');
      setEmails(data.emails);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emails');
      console.error('Error fetching emails:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Auto-refresh every 60 seconds when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchEmails(true);
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [fetchEmails, isAuthenticated]);

  // Manual refresh
  const handleRefresh = () => {
    fetchEmails(true);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Filter emails based on search and filter type
  const filteredEmails = emails.filter(email => {
    const matchesSearch = searchQuery === '' || 
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.snippet.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = 
      filter === 'all' || 
      (filter === 'unread' && !email.isRead) ||
      (filter === 'starred' && email.labels.includes('STARRED'));

    return matchesSearch && matchesFilter;
  });

  // Mark email as read
  const markAsRead = async (emailId: string) => {
    try {
      await fetch(`/api/emails/${emailId}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      
      setEmails(prevEmails =>
        prevEmails.map(email =>
          email.id === emailId ? { ...email, isRead: true } : email
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking email as read:', err);
    }
  };

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    if (!email.isRead) {
      markAsRead(email.id);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1f26]">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#1a1f26] text-white flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-[#252b36] rounded-2xl p-8 shadow-2xl border border-gray-700">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Connect Gmail</h1>
              <p className="text-gray-400">
                Sign in with your Google account to access and manage your emails
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex justify-center mb-6">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                theme="filled_black"
                size="large"
                text="continue_with"
                shape="rectangular"
              />
            </div>

            <div className="mt-8 pt-6 border-t border-gray-700">
              <div className="space-y-3 text-sm text-gray-400">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                  <p>View and manage your Gmail inbox</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                  <p>Auto-sync emails every 60 seconds</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                  <p>Secure OAuth 2.0 authentication</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1f26]">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading emails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1f26] text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-[#252b36] sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Emails</h1>
              <p className="text-gray-400 text-sm mt-1">
                {userEmail ? `Connected: ${userEmail}` : 'Gmail inbox synced with your account'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1a1f26] border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1a1f26] text-gray-400 hover:text-white'
              }`}
            >
              All ({emails.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1a1f26] text-gray-400 hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('starred')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'starred'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1a1f26] text-gray-400 hover:text-white'
              }`}
            >
              <Star className="w-4 h-4 inline mr-1" />
              Starred
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Email List/Detail View */}
      <div className="flex h-[calc(100vh-240px)]">
        {/* Email List */}
        <div className={`${selectedEmail ? 'w-1/3' : 'w-full'} border-r border-gray-700 overflow-y-auto`}>
          {filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Mail className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">No emails found</p>
            </div>
          ) : (
            filteredEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => handleEmailClick(email)}
                className={`p-4 border-b border-gray-700 cursor-pointer transition-colors ${
                  selectedEmail?.id === email.id
                    ? 'bg-[#252b36]'
                    : 'hover:bg-[#252b36]'
                } ${!email.isRead ? 'bg-[#252b36]/50' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium truncate ${!email.isRead ? 'text-white' : 'text-gray-300'}`}>
                          {email.from}
                        </p>
                        {!email.isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{email.fromEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {email.hasAttachments && (
                      <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(email.date)}
                    </span>
                  </div>
                </div>
                <p className={`font-medium mb-1 truncate ${!email.isRead ? 'text-white' : 'text-gray-300'}`}>
                  {email.subject || '(No Subject)'}
                </p>
                <p className="text-sm text-gray-500 line-clamp-2">{email.snippet}</p>
              </div>
            ))
          )}
        </div>

        {/* Email Detail */}
        {selectedEmail && (
          <div className="w-2/3 overflow-y-auto bg-[#1a1f26]">
            <div className="p-6">
              {/* Email Header */}
              <div className="mb-6 pb-6 border-b border-gray-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">
                      {selectedEmail.subject || '(No Subject)'}
                    </h2>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-medium">{selectedEmail.from}</p>
                        <p className="text-sm text-gray-500">{selectedEmail.fromEmail}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                      <Star className="w-5 h-5 text-gray-400 hover:text-yellow-500" />
                    </button>
                    <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                      <Archive className="w-5 h-5 text-gray-400 hover:text-blue-500" />
                    </button>
                    <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-500" />
                    </button>
                    <button
                      onClick={() => setSelectedEmail(null)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors ml-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(selectedEmail.date).toLocaleString()}</span>
                </div>
              </div>

              {/* Attachments */}
              {/* --- UPDATED ATTACHMENTS SECTION --- */}
              {selectedEmail.hasAttachments && selectedEmail.attachments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Attachments ({selectedEmail.attachments.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmail.attachments.map((attachment, index) => (
                      <a
                        key={index}
                        // Use the URL from Firebase
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        // Add styles to make it clear it's a clickable link
                        className={`px-3 py-2 bg-[#252b36] border border-gray-700 rounded-lg text-sm flex items-center gap-2 ${
                          attachment.url 
                            ? 'hover:bg-gray-600 transition-colors' 
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                        // Prevent click if URL is missing
                        onClick={(e) => !attachment.url && e.preventDefault()}
                        title={attachment.url ? `Open ${attachment.filename}` : 'Attachment failed to upload'}
                      >
                        {attachment.url ? (
                          // Show Download icon if URL exists
                          <Download className="w-4 h-4 text-blue-400" />
                        ) : (
                          // Show Paperclip icon if URL is missing
                          <Paperclip className="w-4 h-4 text-gray-500" />
                        )}
                        
                        <span className="truncate max-w-[200px]">{attachment.filename}</span>
                        <span className="text-gray-500 text-xs">
                          ({(attachment.size / 1024).toFixed(1)} KB)
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Body */}
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Wrap with GoogleOAuthProvider
const EmailsPage: React.FC = () => {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="min-h-screen bg-[#1a1f26] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">Google Client ID not configured</p>
          <p className="text-gray-400 text-sm">
            Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your .env file
          </p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <EmailsContent />
    </GoogleOAuthProvider>
  );
};

export default EmailsPage;