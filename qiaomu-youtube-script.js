// ==UserScript==
// @name         Qiaomu's YouTube Script
// @description  Essential YouTube enhancements by 向阳乔木: transcript export, playback speed control, tab view layout, and comment export.
// @author       向阳乔木 (https://x.com/vista8)
// @license      AGPL-3.0-or-later
// @version      1.6.0
// @namespace    QiaomuYouTubeScript
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @match        https://*.youtube.com/*
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.xmlHttpRequest
// @connect      youtube.com
// @run-at       document-start
// @noframes
// @homepageURL  https://www.qiaomu.ai/
// ==/UserScript==

/************************************************************************
*                                                                       *
*   Qiaomu's YouTube Script                                             *
*   Author: 向阳乔木 (https://www.qiaomu.ai/)                            *
*   Twitter: https://x.com/vista8                                       *
*   Based on: YouTube Alchemy by Tim Macy                               *
*                                                                       *
*   Core features:                                                      *
*   1. Transcript Export (NotebookLM/ChatGPT/Download/Copy)            *
*   2. Playback Speed Control (0.25x-17x, keyboard shortcuts)          *
*   3. Tab View Layout (Theater mode + tabs for comments/chapters)     *
*   4. Comment Export (Copy all comments)                              *
*                                                                       *
************************************************************************/

(async function () {
    'use strict';

    // ==================== CONFIGURATION ====================

    const DEFAULT_CONFIG = {
        // Transcript Export
        YouTubeTranscriptExporter: true,
        lazyTranscriptLoading: false,
        targetChatGPTUrl: 'https://ChatGPT.com/',
        targetNotebookLMUrl: 'https://NotebookLM.Google.com/',
        targetChatGPTLabel: 'ChatGPT',
        targetNotebookLMLabel: 'NotebookLM',
        fileNamingFormat: 'title-channel',
        includeTimestamps: true,
        includeChapterHeaders: true,
        openSameTab: true,
        transcriptTimestamps: false,
        preventBackgroundExecution: true,
        ChatGPTPrompt: `Summarize this YouTube transcript into two sections:
### Key Takeaways:
- Three bullet points, each under 30 words, **bolding** important terms

### One-Paragraph Summary:
A 100+ word summary **bolding** key phrases that capture the core message.`,
        buttonIcons: {
            settings: '⋮',
            lazyLoad: '📜',
            download: '⬇️',
            copy: '📋',
            ChatGPT: '💬',
            NotebookLM: '📔'
        },

        // Playback Speed Control
        playbackSpeed: true,
        playbackSpeedBtns: false,
        playbackSpeedValue: 1,
        playbackSpeedToggle: 's',
        playbackSpeedDecrease: 'a',
        playbackSpeedIncrease: 'd',
        playbackSpeedKey1: '',
        playbackSpeedKey1s: '',
        playbackSpeedKey2: '',
        playbackSpeedKey2s: '',
        playbackSpeedKey3: '',
        playbackSpeedKey3s: '',
        playbackSpeedKey4: '',
        playbackSpeedKey4s: '',
        playbackSpeedKey5: '',
        playbackSpeedKey5s: '',
        playbackSpeedKey6: '',
        playbackSpeedKey6s: '',
        playbackSpeedKey7: '',
        playbackSpeedKey7s: '',
        playbackSpeedKey8: '',
        playbackSpeedKey8s: '',
        VerifiedArtist: false,
        defaultQuality: 'auto',
        displayRemainingTime: true,
        showRemainingCompact: false,

        // Tab View Layout
        videoTabView: true,
        toggleTheaterModeBtn: true,
        tabViewChapters: true,
        autoOpenChapters: true,
        autoOpenTranscript: false,
        autoOpenComments: false,
        autoTheaterMode: false,
        maxVidSize: false,
        expandVideoDescription: false,

        // Comment Export
        copyCommentsButton: true,
        fetchAllComments: true,        // 使用 API 获取所有评论
        maxCommentsToFetch: 1000,      // 最大获取评论数

        // Basic Styling
        compactLayout: false,
        squareDesign: false,
        squareAvatars: false,
        noAmbientMode: false,
        pureBWBackground: true
    };

    // Load user configuration
    let storedConfig = {};
    try {
        storedConfig = await GM.getValue('USER_CONFIG', {});
    } catch (error) {
        console.error("YouTubeAlchemy Lite: Error loading config:", error);
    }

    let USER_CONFIG = {
        ...DEFAULT_CONFIG,
        ...storedConfig,
        buttonIcons: {
            ...DEFAULT_CONFIG.buttonIcons,
            ...(storedConfig.buttonIcons || {})
        }
    };

    // Save config helper
    async function saveConfig() {
        try {
            await GM.setValue('USER_CONFIG', USER_CONFIG);
        } catch (error) {
            console.error("YouTubeAlchemy Lite: Error saving config:", error);
        }
    }

    // ==================== TOAST NOTIFICATIONS ====================

    function showToast(message, type = 'info', duration = 2500) {
        // Remove existing toast if any
        const existingToast = document.querySelector('.CentAnni-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `CentAnni-toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('active');
        });

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // ==================== CSS STYLES ====================

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        /* ===== NOTIFICATION & MODAL SYSTEM ===== */
        .CentAnni-overlay {
            position: fixed;
            display: flex;
            z-index: 2053;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            align-items: center;
            justify-content: center;
            background-color: rgba(0, 0, 0, .5);
            backdrop-filter: blur(5px);
        }

        .CentAnni-notification {
            background: hsl(0, 0%, 7%);
            padding: 20px 30px;
            border-radius: 8px;
            border: 1px solid hsl(0, 0%, 18.82%);
            max-width: 80%;
            text-align: center;
            font-family: -apple-system, "Roboto", "Arial", sans-serif;
            font-size: 16px;
            color: white;
            user-select: none;
        }

        /* ===== TRANSCRIPT EXPORT BUTTONS ===== */
        .CentAnni-button-wrapper {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-right: 8px;
        }

        .CentAnni-button-wrapper button {
            padding: 6px 10px;
            cursor: pointer;
            background-color: transparent;
            color: var(--yt-spec-text-primary, #f1f1f1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 18px;
            font-family: "Roboto", "Arial", sans-serif;
            font-size: 14px;
            font-weight: 500;
            transition: all .2s ease-out;
            white-space: nowrap;
        }

        .CentAnni-button-wrapper button:hover {
            background-color: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .CentAnni-button-wrapper button:active {
            background-color: rgba(255, 255, 255, 0.2);
        }

        #transcript-lazy-button {
            background-color: hsl(51, 100%, 50%);
            color: #000;
            border-color: hsl(51, 100%, 50%);
        }

        #transcript-lazy-button:hover {
            background-color: hsl(51, 100%, 60%);
            border-color: hsl(51, 100%, 60%);
        }

        /* Dark mode adjustments */
        html[dark] .CentAnni-button-wrapper button {
            color: #f1f1f1;
        }

        html:not([dark]) .CentAnni-button-wrapper button {
            color: #030303;
            border-color: rgba(0, 0, 0, 0.1);
        }

        html:not([dark]) .CentAnni-button-wrapper button:hover {
            background-color: rgba(0, 0, 0, 0.05);
            border-color: rgba(0, 0, 0, 0.2);
        }

        .transcript-preload {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 2px solid rgba(255, 255, 255, .3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* ===== PLAYBACK SPEED CONTROL ===== */
        #CentAnni-playback-speed-popup {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: hsl(0, 0%, 7%);
            padding: 12px 20px;
            border-radius: 8px;
            border: 1px solid hsl(0, 0%, 18.82%);
            font-family: "Roboto", "Arial", sans-serif;
            font-size: 16px;
            color: white;
            opacity: 0;
            pointer-events: none;
            transition: opacity .3s;
            z-index: 2060;
        }

        #CentAnni-playback-speed-popup.active {
            opacity: 1;
        }

        /* ===== TOAST NOTIFICATIONS ===== */
        .CentAnni-toast {
            position: fixed;
            top: 80px;
            right: 30px;
            background: rgba(28, 28, 28, 0.95);
            backdrop-filter: blur(10px);
            padding: 12px 18px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            font-family: "Roboto", "Arial", sans-serif;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
            opacity: 0;
            transform: translateY(-10px);
            pointer-events: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 10000;
            max-width: 350px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .CentAnni-toast.active {
            opacity: 1;
            transform: translateY(0);
        }

        .CentAnni-toast.success {
            border-color: rgba(34, 197, 94, 0.3);
        }

        .CentAnni-toast.error {
            border-color: rgba(239, 68, 68, 0.3);
        }

        .CentAnni-toast.info {
            border-color: rgba(59, 130, 246, 0.3);
        }

        .CentAnni-playback-control {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 10px 12px;
            background-color: rgba(28, 28, 28, .9);
            border-radius: 6px;
        }

        .CentAnni-playback-control button {
            padding: 5px 13px;
            cursor: pointer;
            background-color: hsl(0, 0%, 15%);
            color: rgba(255, 255, 255, 0.95);
            border: 1px solid hsl(0, 0%, 30%);
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .CentAnni-playback-control button:hover {
            background-color: hsl(0, 0%, 22%);
            border-color: hsl(0, 0%, 40%);
            transform: translateY(-1px);
        }

        .CentAnni-playback-control button:active {
            background-color: hsl(0, 0%, 30%);
            transform: translateY(0);
        }

        #CentAnni-speed-display {
            min-width: 55px;
            text-align: center;
            color: rgba(255, 255, 255, 0.95);
            font-weight: 600;
            letter-spacing: 0.02em;
        }

        .CentAnni-speed-preset {
            margin-left: 6px !important;
            font-size: 13px !important;
            padding: 5px 11px !important;
            font-weight: 500 !important;
            background-color: rgba(255, 255, 255, 0.06) !important;
            color: rgba(255, 255, 255, 0.75) !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            border-radius: 4px !important;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .CentAnni-speed-preset:hover {
            background-color: rgba(59, 130, 246, 0.15) !important;
            color: rgba(255, 255, 255, 0.95) !important;
            border-color: rgba(59, 130, 246, 0.3) !important;
            transform: translateY(-1px);
        }

        .CentAnni-speed-preset:active {
            background-color: rgba(59, 130, 246, 0.25) !important;
            transform: translateY(0);
        }

        .CentAnni-copy-transcript {
            margin-left: 8px !important;
            font-size: 14px !important;
            padding: 5px 10px !important;
            font-weight: 500 !important;
            background-color: rgba(255, 255, 255, 0.05) !important;
            color: rgba(255, 255, 255, 0.65) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 4px !important;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            cursor: pointer !important;
        }

        .CentAnni-copy-transcript:hover {
            background-color: rgba(59, 130, 246, 0.12) !important;
            color: rgba(255, 255, 255, 0.9) !important;
            border-color: rgba(59, 130, 246, 0.25) !important;
            transform: translateY(-1px);
        }

        .CentAnni-copy-transcript:active {
            background-color: rgba(59, 130, 246, 0.2) !important;
            transform: translateY(0);
        }

        .CentAnni-author-link {
            margin-left: 8px !important;
            padding: 5px 10px !important;
            background-color: rgba(255, 255, 255, 0.04) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            border-radius: 4px !important;
            color: rgba(255, 255, 255, 0.5) !important;
            font-size: 15px !important;
            text-decoration: none !important;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
        }

        .CentAnni-author-link:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
            color: rgba(255, 255, 255, 0.9) !important;
            transform: translateY(-1px);
        }

        #CentAnni-speed-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 12px;
            padding: 12px;
            background-color: rgba(28, 28, 28, .5);
            border-radius: 4px;
        }

        #CentAnni-speed-buttons button {
            padding: 6px 10px;
            background-color: hsl(0, 0%, 15%);
            color: white;
            border: 1px solid hsl(0, 0%, 30%);
            border-radius: 3px;
            cursor: pointer;
            font-size: 13px;
            transition: all .2s;
        }

        #CentAnni-speed-buttons button:hover {
            background-color: hsl(0, 0%, 25%);
        }

        #CentAnni-speed-buttons button.active {
            background-color: hsl(217, 91%, 59%);
            border-color: hsl(217, 91%, 70%);
        }

        /* ===== TAB VIEW LAYOUT ===== */
        .CentAnni-video-tabView .CentAnni-tabView {
            position: relative;
            display: flex;
            flex-direction: column;
            width: var(--ytd-watch-flexy-sidebar-width, 400px);
            height: 100%;
        }

        .CentAnni-tabView-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 50px;
            padding: 0 12px;
            background-color: var(--yt-spec-brand-background-primary, hsl(0, 0%, 7%));
            border-bottom: 1px solid hsl(0, 0%, 18.82%);
        }

        .CentAnni-tabView-subheader {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            padding: 8px;
            background-color: rgba(28, 28, 28, .5);
        }

        .CentAnni-tabView-tab {
            padding: 8px 16px;
            cursor: pointer;
            background-color: rgba(255, 255, 255, .1);
            color: #f1f1f1;
            border: none;
            border-radius: 4px;
            font-family: "Roboto", "Arial", sans-serif;
            font-size: 14px;
            font-weight: 500;
            transition: all .2s;
        }

        .CentAnni-tabView-tab:hover {
            background-color: rgba(255, 255, 255, .2);
        }

        .CentAnni-tabView-tab.active {
            background-color: #f1f1f1;
            color: #0f0f0f;
        }

        .CentAnni-tabView-content {
            display: none;
            overflow-y: auto;
            flex: 1;
            min-height: 0;
        }

        .CentAnni-tabView-content.active {
            display: block !important;
        }

        /* Theater mode adjustments */
        ytd-watch-flexy[theater] .CentAnni-tabView-content {
            max-height: calc(100vh - 150px);
        }

        /* Compact layout */
        html.CentAnni-style-compact-layout ytd-rich-item-renderer {
            margin: 0 !important;
        }

        /* Square design */
        html.CentAnni-style-square-design * {
            border-radius: 0 !important;
        }

        html.CentAnni-style-square-avatars img[is-rounded],
        html.CentAnni-style-square-avatars yt-img-shadow[is-rounded] {
            border-radius: 0 !important;
        }

        /* No ambient mode */
        html.CentAnni-style-no-ambient ytd-watch-flexy[theater]:not([fullscreen]) #cinematics {
            display: none !important;
        }

        /* Pure BW background */
        html.CentAnni-style-pure-bg ytd-watch-flexy[theater]:not([fullscreen]) {
            background-color: #000 !important;
        }
    `;

    // Append stylesheet
    document.addEventListener('DOMContentLoaded', () => {
        const head = document.head || document.getElementsByTagName('head')[0];
        if (head) {
            head.appendChild(styleSheet);
        } else {
            document.documentElement.appendChild(styleSheet);
        }
    });

    // Apply CSS classes based on config
    function applyCSSClasses() {
        const docElement = document.documentElement;
        const classMap = {
            videoTabView: 'CentAnni-video-tabView',
            compactLayout: 'CentAnni-style-compact-layout',
            squareDesign: 'CentAnni-style-square-design',
            squareAvatars: 'CentAnni-style-square-avatars',
            noAmbientMode: 'CentAnni-style-no-ambient',
            pureBWBackground: 'CentAnni-style-pure-bg'
        };

        for (const [configKey, cssClass] of Object.entries(classMap)) {
            if (USER_CONFIG[configKey]) {
                docElement.classList.add(cssClass);
            } else {
                docElement.classList.remove(cssClass);
            }
        }
    }

    applyCSSClasses();

    // ==================== UTILITY FUNCTIONS ====================

    function showNotification(message, duration = 2000) {
        const overlay = document.createElement('div');
        overlay.classList.add('CentAnni-overlay');

        const notification = document.createElement('div');
        notification.classList.add('CentAnni-notification');

        // Support multiline messages
        notification.style.whiteSpace = 'pre-line';
        notification.textContent = message;

        overlay.appendChild(notification);
        document.body.appendChild(overlay);

        setTimeout(() => {
            overlay.remove();
        }, duration);
    }

    function waitForElement(selector, parent = document, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = parent.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = parent.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(parent, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    // ==================== FEATURE 1: TRANSCRIPT EXPORT ====================

    // Auto-load transcript in background
    async function preloadTranscript() {
        const watchFlexy = document.querySelector('ytd-watch-flexy');
        if (!watchFlexy) return false;

        const transcriptPanel = watchFlexy.querySelector(
            'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
        );

        if (!transcriptPanel) return false;

        // Check if transcript is already loaded
        const segmentsContainer = transcriptPanel.querySelector('ytd-transcript-segment-list-renderer #segments-container');
        const firstItem = segmentsContainer?.querySelector('ytd-transcript-segment-renderer');
        if (segmentsContainer && firstItem) {
            return true; // Already loaded
        }

        // Auto-open transcript panel to trigger loading
        const isClosed = transcriptPanel.getAttribute('visibility') === 'ENGAGEMENT_PANEL_VISIBILITY_HIDDEN';
        if (isClosed) {
            transcriptPanel.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED');

            // Wait for transcript to load
            return new Promise((resolve) => {
                const observer = new MutationObserver(() => {
                    const items = transcriptPanel.querySelectorAll('ytd-transcript-segment-renderer');
                    if (items.length > 0) {
                        observer.disconnect();
                        // Close panel after loading (user didn't manually open it)
                        transcriptPanel.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_HIDDEN');
                        resolve(true);
                    }
                });

                observer.observe(transcriptPanel, {
                    childList: true,
                    subtree: true
                });

                // Timeout after 10 seconds
                setTimeout(() => {
                    observer.disconnect();
                    if (isClosed) {
                        transcriptPanel.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_HIDDEN');
                    }
                    resolve(false);
                }, 10000);
            });
        }

        return false;
    }

    async function createTranscriptButtons() {
        if (!USER_CONFIG.YouTubeTranscriptExporter) return;

        // Remove existing buttons
        document.querySelectorAll('.CentAnni-button-wrapper').forEach(el => el.remove());

        // Find where to place buttons (masthead end or guide header)
        const mastheadEnd = document.querySelector('#masthead #end');
        const guideHeader = document.querySelector('#guide #guide-content > #header');
        const targetContainer = mastheadEnd || guideHeader;

        if (!targetContainer) {
            // Wait for masthead to load
            setTimeout(createTranscriptButtons, 1000);
            return;
        }

        // Try to preload transcript in background
        if (!USER_CONFIG.lazyTranscriptLoading) {
            preloadTranscript().catch(() => {
                // Ignore errors, buttons will still work if user manually opens transcript
            });
        }

        // Create button container
        const buttonWrapper = document.createElement('div');
        buttonWrapper.classList.add('CentAnni-button-wrapper');
        buttonWrapper.id = 'transcript-button-container';

        // Download button
        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'transcript-download-button';
        downloadBtn.textContent = USER_CONFIG.buttonIcons.download || '⬇️';
        downloadBtn.title = 'Download Transcript';
        downloadBtn.addEventListener('click', () => downloadTranscript());
        buttonWrapper.appendChild(downloadBtn);

        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.id = 'transcript-copy-button';
        copyBtn.textContent = USER_CONFIG.buttonIcons.copy || '📋';
        copyBtn.title = 'Copy Transcript';
        copyBtn.addEventListener('click', () => copyTranscript());
        buttonWrapper.appendChild(copyBtn);

        // ChatGPT button
        if (USER_CONFIG.targetChatGPTUrl) {
            const chatGPTBtn = document.createElement('button');
            chatGPTBtn.id = 'transcript-ChatGPT-button';
            chatGPTBtn.textContent = USER_CONFIG.buttonIcons.ChatGPT || '💬';
            chatGPTBtn.title = 'Send to ' + (USER_CONFIG.targetChatGPTLabel || 'ChatGPT');
            chatGPTBtn.addEventListener('click', () => sendToChatGPT());
            buttonWrapper.appendChild(chatGPTBtn);
        }

        // NotebookLM button
        if (USER_CONFIG.targetNotebookLMUrl) {
            const notebookBtn = document.createElement('button');
            notebookBtn.id = 'transcript-NotebookLM-button';
            notebookBtn.textContent = USER_CONFIG.buttonIcons.NotebookLM || '📔';
            notebookBtn.title = 'Send to ' + (USER_CONFIG.targetNotebookLMLabel || 'NotebookLM');
            notebookBtn.addEventListener('click', () => sendToNotebookLM());
            buttonWrapper.appendChild(notebookBtn);
        }

        // Lazy load button (if enabled) - placed at the end
        if (USER_CONFIG.lazyTranscriptLoading) {
            const lazyBtn = document.createElement('button');
            lazyBtn.id = 'transcript-lazy-button';
            lazyBtn.textContent = USER_CONFIG.buttonIcons.lazyLoad || '📜';
            lazyBtn.title = 'Load Transcript';
            lazyBtn.addEventListener('click', loadTranscript);
            buttonWrapper.appendChild(lazyBtn);
        }

        // Append to masthead (right side of top nav bar)
        targetContainer.prepend(buttonWrapper);
    }

    function loadTranscript() {
        const watchFlexy = document.querySelector('ytd-watch-flexy');
        const transcriptPanel = watchFlexy?.querySelector(
            'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
        );

        if (transcriptPanel) {
            transcriptPanel.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED');
            // Silent loading - no notification needed
        }
    }

    function checkTranscriptAvailable() {
        // Check if "Show transcript" button exists
        const transcriptButton = document.querySelector('#button-container button[aria-label="Show transcript"]');
        const transcriptSection = document.querySelector('ytd-video-description-transcript-section-renderer');

        if (!transcriptButton && !transcriptSection) {
            throw new Error('Transcript unavailable.\nThis video may not have subtitles/captions.');
        }

        // Check if transcript is loaded
        const transcriptItems = document.querySelectorAll('ytd-transcript-segment-list-renderer ytd-transcript-segment-renderer');
        if (transcriptItems.length === 0) {
            throw new Error('Transcript has not loaded.\nPlease try clicking the "Show transcript" button below the video.');
        }
    }

    function getTranscriptText() {
        // First check if transcript is available
        checkTranscriptAvailable();

        const watchFlexy = document.querySelector('ytd-watch-flexy');
        const segmentsContainer = watchFlexy?.querySelector(
            'ytd-transcript-segment-list-renderer #segments-container'
        );

        if (!segmentsContainer) {
            throw new Error('Transcript not loaded. Please open the transcript panel first.');
        }

        const segments = segmentsContainer.children;
        let transcriptText = '';
        let currentChapter = '';

        for (const segment of segments) {
            if (segment.tagName === 'YTD-TRANSCRIPT-SECTION-HEADER-RENDERER') {
                // Chapter header
                if (USER_CONFIG.includeChapterHeaders) {
                    const chapterTitle = segment.querySelector('.segment-timestamp')?.textContent?.trim();
                    const chapterText = segment.querySelector('#content')?.textContent?.trim();
                    currentChapter = `\n\n=== ${chapterText} (${chapterTitle}) ===\n\n`;
                    transcriptText += currentChapter;
                }
            } else if (segment.tagName === 'YTD-TRANSCRIPT-SEGMENT-RENDERER') {
                // Regular segment
                const timestamp = segment.querySelector('.segment-timestamp')?.textContent?.trim();
                const text = segment.querySelector('.segment-text')?.textContent?.trim();

                if (text) {
                    if (USER_CONFIG.includeTimestamps && timestamp) {
                        transcriptText += `[${timestamp}] ${text}\n`;
                    } else {
                        transcriptText += `${text}\n`;
                    }
                }
            }
        }

        return transcriptText.trim();
    }

    function getVideoInfo() {
        const title = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent?.trim() ||
                     document.querySelector('yt-formatted-string.ytd-watch-metadata')?.textContent?.trim() ||
                     'YouTube_Video';

        const channelName = document.querySelector('ytd-channel-name a')?.textContent?.trim() ||
                           document.querySelector('yt-formatted-string.ytd-channel-name')?.textContent?.trim() ||
                           'Unknown_Channel';

        const videoId = new URLSearchParams(window.location.search).get('v') || 'unknown';

        return { title, channelName, videoId };
    }

    function getFileName() {
        const { title, channelName, videoId } = getVideoInfo();
        const format = USER_CONFIG.fileNamingFormat || 'title-channel';

        const sanitize = (str) => str.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);

        switch (format) {
            case 'title-channel':
                return `${sanitize(title)}_${sanitize(channelName)}.txt`;
            case 'channel-title':
                return `${sanitize(channelName)}_${sanitize(title)}.txt`;
            case 'title-id':
                return `${sanitize(title)}_${videoId}.txt`;
            default:
                return `${sanitize(title)}.txt`;
        }
    }

    async function downloadTranscript() {
        try {
            const transcriptText = getTranscriptText();
            const { title, channelName } = getVideoInfo();

            const content = `Title: ${title}\nChannel: ${channelName}\nURL: ${window.location.href}\n\n${transcriptText}`;

            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = getFileName();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast('已下载字幕', 'success');
        } catch (error) {
            showToast(error.message.includes('Transcript unavailable') ? '没有找到字幕' : '下载失败', 'error');
            console.error('Download error:', error);
        }
    }

    async function copyTranscript() {
        try {
            const transcriptText = getTranscriptText();
            const { title, channelName } = getVideoInfo();

            const content = `Title: ${title}\nChannel: ${channelName}\nURL: ${window.location.href}\n\n${transcriptText}`;

            await navigator.clipboard.writeText(content);
            showToast('已复制字幕', 'success');
        } catch (error) {
            showToast(error.message.includes('Transcript unavailable') ? '没有找到字幕' : '复制失败', 'error');
            console.error('Copy error:', error);
        }
    }

    async function sendToChatGPT() {
        try {
            const transcriptText = getTranscriptText();
            const { title, channelName } = getVideoInfo();

            const prompt = USER_CONFIG.ChatGPTPrompt || '';
            const content = `${prompt}\n\nTitle: ${title}\nChannel: ${channelName}\nURL: ${window.location.href}\n\n${transcriptText}`;

            await navigator.clipboard.writeText(content);

            const targetUrl = USER_CONFIG.targetChatGPTUrl || 'https://ChatGPT.com/';
            window.open(targetUrl, USER_CONFIG.openSameTab ? '_self' : '_blank');

            showToast('已复制并打开ChatGPT', 'success');
        } catch (error) {
            showToast(error.message.includes('Transcript unavailable') ? '没有找到字幕' : '操作失败', 'error');
            console.error('ChatGPT error:', error);
        }
    }

    async function sendToNotebookLM() {
        try {
            const transcriptText = getTranscriptText();
            const { title, channelName } = getVideoInfo();

            const content = `Title: ${title}\nChannel: ${channelName}\nURL: ${window.location.href}\n\n${transcriptText}`;

            await navigator.clipboard.writeText(content);

            const targetUrl = USER_CONFIG.targetNotebookLMUrl || 'https://NotebookLM.Google.com/';
            window.open(targetUrl, USER_CONFIG.openSameTab ? '_self' : '_blank');

            showToast('已复制并打开NotebookLM', 'success');
        } catch (error) {
            showToast(error.message.includes('Transcript unavailable') ? '没有找到字幕' : '操作失败', 'error');
            console.error('NotebookLM error:', error);
        }
    }

    // ==================== FEATURE 2: PLAYBACK SPEED CONTROL ====================

    let speedController = null;

    async function createPlaybackSpeedController() {
        if (!USER_CONFIG.playbackSpeed) return;

        const watchFlexy = document.querySelector('ytd-watch-flexy');
        const video = watchFlexy?.querySelector('video.html5-main-video');

        if (!video || speedController) return;

        const defaultSpeed = USER_CONFIG.playbackSpeedValue || 1;

        // Clamp speed to 0.25-17x range
        const setSpeed = (speed) => {
            const clamped = Math.max(0.25, Math.min(17, speed));
            video.playbackRate = clamped;
            video.preservesPitch = video.mozPreservesPitch = video.webkitPreservesPitch = true;
            updateSpeedDisplay(clamped);
            showSpeedNotification(clamped);
            return clamped;
        };

        const updateSpeedDisplay = (speed) => {
            const display = document.getElementById('CentAnni-speed-display');
            if (display) {
                display.textContent = `${speed.toFixed(2)}x`;
            }
            updateActiveSpeedButton(speed);
        };

        const showSpeedNotification = (speed) => {
            let popup = document.getElementById('CentAnni-playback-speed-popup');
            if (!popup) {
                popup = document.createElement('div');
                popup.id = 'CentAnni-playback-speed-popup';
                document.body.appendChild(popup);
            }
            popup.textContent = `Speed: ${speed.toFixed(2)}x`;
            popup.classList.add('active');
            setTimeout(() => popup.classList.remove('active'), 900);
        };

        // Create UI control panel
        const menuRenderer = watchFlexy.querySelector('#secondary-inner');
        if (!menuRenderer) return;

        const controlDiv = document.createElement('div');
        controlDiv.id = 'CentAnni-playback-speed-control';
        controlDiv.classList.add('CentAnni-playback-control');

        const minusBtn = document.createElement('button');
        minusBtn.textContent = '-';
        minusBtn.addEventListener('click', () => {
            setSpeed(video.playbackRate - 0.25);
        });

        const speedDisplay = document.createElement('span');
        speedDisplay.id = 'CentAnni-speed-display';
        speedDisplay.textContent = `${video.playbackRate.toFixed(2)}x`;

        const plusBtn = document.createElement('button');
        plusBtn.textContent = '+';
        plusBtn.addEventListener('click', () => {
            setSpeed(video.playbackRate + 0.25);
        });

        // Quick speed presets: 1.5x and 2x
        const speed15Btn = document.createElement('button');
        speed15Btn.textContent = '1.5x';
        speed15Btn.classList.add('CentAnni-speed-preset');
        speed15Btn.title = 'Set speed to 1.5x';
        speed15Btn.addEventListener('click', () => {
            setSpeed(1.5);
        });

        const speed2Btn = document.createElement('button');
        speed2Btn.textContent = '2x';
        speed2Btn.classList.add('CentAnni-speed-preset');
        speed2Btn.title = 'Set speed to 2x';
        speed2Btn.addEventListener('click', () => {
            setSpeed(2);
        });

        // Copy transcript button
        const copyTranscriptBtn = document.createElement('button');
        copyTranscriptBtn.textContent = '📋';
        copyTranscriptBtn.classList.add('CentAnni-copy-transcript');
        copyTranscriptBtn.title = 'Copy transcript to clipboard';
        copyTranscriptBtn.addEventListener('click', async () => {
            try {
                const transcriptText = getTranscriptText();
                if (!transcriptText) {
                    showToast('没有找到字幕', 'error');
                    return;
                }

                await navigator.clipboard.writeText(transcriptText);

                // Visual feedback
                const originalText = copyTranscriptBtn.textContent;
                copyTranscriptBtn.textContent = '✓';
                copyTranscriptBtn.style.color = 'rgba(59, 130, 246, 0.9)';

                setTimeout(() => {
                    copyTranscriptBtn.textContent = originalText;
                    copyTranscriptBtn.style.color = '';
                }, 1500);

                showToast('已复制字幕', 'success', 1500);
            } catch (error) {
                console.error('Failed to copy transcript:', error);
                showToast('复制失败', 'error');
            }
        });

        // Author link button
        const authorBtn = document.createElement('a');
        authorBtn.textContent = '👤';
        authorBtn.href = 'https://x.com/vista8';
        authorBtn.target = '_blank';
        authorBtn.rel = 'noopener noreferrer';
        authorBtn.classList.add('CentAnni-author-link');
        authorBtn.title = 'Follow @vista8 on X';

        controlDiv.appendChild(minusBtn);
        controlDiv.appendChild(speedDisplay);
        controlDiv.appendChild(plusBtn);
        controlDiv.appendChild(speed15Btn);
        controlDiv.appendChild(speed2Btn);
        controlDiv.appendChild(copyTranscriptBtn);
        controlDiv.appendChild(authorBtn);
        menuRenderer.prepend(controlDiv);

        // Create preset speed buttons (if enabled)
        if (USER_CONFIG.playbackSpeedBtns) {
            createSpeedPresetButtons(video, setSpeed);
        }

        // Keyboard shortcuts
        const speedKeyMap = buildSpeedKeyMap();
        const handleKeyPress = (event) => {
            const key = event.key.toLowerCase();
            const isTextInput = ['input', 'textarea', 'select'].includes(
                event.target?.tagName?.toLowerCase()
            );

            if (isTextInput) return;

            const speedKeys = new Set([
                USER_CONFIG.playbackSpeedToggle,
                USER_CONFIG.playbackSpeedDecrease,
                USER_CONFIG.playbackSpeedIncrease,
                ...Object.keys(speedKeyMap)
            ]);

            if (!speedKeys.has(key)) return;

            event.preventDefault();
            event.stopPropagation();

            if (key === USER_CONFIG.playbackSpeedToggle) {
                // Toggle between 1x and default speed
                setSpeed(video.playbackRate !== 1 ? 1 : defaultSpeed);
            } else if (key === USER_CONFIG.playbackSpeedDecrease) {
                setSpeed(video.playbackRate - 0.25);
            } else if (key === USER_CONFIG.playbackSpeedIncrease) {
                setSpeed(video.playbackRate + 0.25);
            } else if (speedKeyMap[key] !== undefined) {
                setSpeed(speedKeyMap[key]);
            }
        };

        window.addEventListener('keydown', handleKeyPress, true);

        // Listen to YouTube's native rate changes
        video.addEventListener('ratechange', () => {
            const clamped = Math.max(0.25, Math.min(17, video.playbackRate));
            if (Math.abs(clamped - video.playbackRate) > 0.01) {
                video.playbackRate = clamped;
            }
            updateSpeedDisplay(clamped);
        });

        // Initialize to default speed
        setSpeed(defaultSpeed);

        // Store controller reference
        speedController = {
            setSpeed,
            cleanup: () => {
                window.removeEventListener('keydown', handleKeyPress, true);
                controlDiv.remove();
                speedController = null;
            }
        };

        // Cleanup on navigation
        document.addEventListener('yt-navigate-start', () => {
            if (speedController) {
                speedController.cleanup();
            }
        }, { once: true });
    }

    function buildSpeedKeyMap() {
        const map = {};
        for (let i = 1; i <= 8; i++) {
            const key = USER_CONFIG[`playbackSpeedKey${i}`];
            const speed = parseFloat(USER_CONFIG[`playbackSpeedKey${i}s`]);
            if (key && !isNaN(speed)) {
                map[key.toLowerCase()] = speed;
            }
        }
        return map;
    }

    function createSpeedPresetButtons(video, setSpeed) {
        const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4];

        const container = document.createElement('div');
        container.id = 'CentAnni-speed-buttons';

        speeds.forEach(speed => {
            const button = document.createElement('button');
            button.textContent = `${speed}x`;
            button.dataset.speed = speed;
            button.addEventListener('click', () => setSpeed(speed));
            container.appendChild(button);
        });

        const secondary = document.getElementById('secondary');
        if (secondary) {
            secondary.prepend(container);
        }
    }

    function updateActiveSpeedButton(currentSpeed) {
        const buttons = document.querySelectorAll('#CentAnni-speed-buttons button');
        buttons.forEach(btn => {
            const btnSpeed = parseFloat(btn.dataset.speed);
            if (Math.abs(btnSpeed - currentSpeed) < 0.01) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // ==================== FEATURE 3: TAB VIEW LAYOUT ====================

    let tabViewInitialized = false;

    async function createTabView() {
        if (!USER_CONFIG.videoTabView || tabViewInitialized) return;

        const watchFlexy = document.querySelector('ytd-watch-flexy');
        if (!watchFlexy) return;

        const secondary = watchFlexy.querySelector('#secondary');
        if (!secondary) return;

        // Check what panels are available
        const transcriptPanel = watchFlexy.querySelector(
            'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
        );
        const chapterPanel = watchFlexy.querySelector(
            'ytd-engagement-panel-section-list-renderer[target-id*="chapter"]'
        );
        const videoInfo = watchFlexy.querySelector('#secondary-inner');
        const commentsSection = watchFlexy.querySelector('ytd-comments#comments');
        const playlistPanel = watchFlexy.querySelector('ytd-playlist-panel-renderer');

        // Create tab view container
        const tabViewDiv = document.createElement('div');
        tabViewDiv.classList.add('CentAnni-tabView');
        tabViewDiv.id = 'CentAnni-tabView';

        // Create header
        const headerDiv = document.createElement('div');
        headerDiv.classList.add('CentAnni-tabView-header');
        headerDiv.innerHTML = '<h3>Video Sections</h3>';
        tabViewDiv.appendChild(headerDiv);

        // Create subheader (tabs)
        const subheaderDiv = document.createElement('div');
        subheaderDiv.classList.add('CentAnni-tabView-subheader');

        const tabs = [];
        let tabIndex = 0;

        // Info tab (always present)
        tabs.push({ id: `tab-${tabIndex++}`, label: 'Info', element: videoInfo });

        // Comments tab
        if (commentsSection) {
            tabs.push({ id: `tab-${tabIndex++}`, label: 'Comments', element: commentsSection });
        }

        // Playlist tab
        if (playlistPanel) {
            tabs.push({ id: `tab-${tabIndex++}`, label: 'Playlist', element: playlistPanel });
        }

        // Chapters tab
        if (chapterPanel && USER_CONFIG.tabViewChapters) {
            tabs.push({ id: `tab-${tabIndex++}`, label: 'Chapters', element: chapterPanel });
        }

        // Transcript tab
        if (transcriptPanel) {
            tabs.push({ id: `tab-${tabIndex++}`, label: 'Transcript', element: transcriptPanel });
        }

        // Create tab buttons
        let activeTab = tabs[0].id;

        tabs.forEach(tab => {
            const tabButton = document.createElement('button');
            tabButton.classList.add('CentAnni-tabView-tab');
            tabButton.dataset.tab = tab.id;
            tabButton.textContent = tab.label;

            tabButton.addEventListener('click', () => {
                activateTab(tab.id);

                // Toggle theater mode if configured
                if (USER_CONFIG.toggleTheaterModeBtn && !watchFlexy.hasAttribute('theater')) {
                    toggleTheaterMode();
                }
            });

            subheaderDiv.appendChild(tabButton);

            // Create content wrapper
            const contentDiv = document.createElement('div');
            contentDiv.classList.add('CentAnni-tabView-content');
            contentDiv.dataset.tab = tab.id;

            if (tab.element) {
                contentDiv.appendChild(tab.element.cloneNode(true));
            }

            tabViewDiv.appendChild(contentDiv);
        });

        tabViewDiv.insertBefore(subheaderDiv, tabViewDiv.children[1]);

        // Replace secondary with tab view
        secondary.innerHTML = '';
        secondary.appendChild(tabViewDiv);

        // Activate first tab
        function activateTab(tabId) {
            activeTab = tabId;

            // Update tab buttons
            subheaderDiv.querySelectorAll('.CentAnni-tabView-tab').forEach(btn => {
                if (btn.dataset.tab === tabId) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // Update content
            tabViewDiv.querySelectorAll('.CentAnni-tabView-content').forEach(content => {
                if (content.dataset.tab === tabId) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        }

        activateTab(activeTab);

        // Auto-open panels if configured
        if (USER_CONFIG.autoOpenChapters && chapterPanel) {
            activateTab(tabs.find(t => t.label === 'Chapters')?.id || activeTab);
        }
        if (USER_CONFIG.autoOpenTranscript && transcriptPanel) {
            activateTab(tabs.find(t => t.label === 'Transcript')?.id || activeTab);
        }
        if (USER_CONFIG.autoOpenComments && commentsSection) {
            activateTab(tabs.find(t => t.label === 'Comments')?.id || activeTab);
        }

        tabViewInitialized = true;

        // Cleanup on navigation
        document.addEventListener('yt-navigate-start', () => {
            tabViewInitialized = false;
        }, { once: true });
    }

    // ==================== COPY COMMENTS ====================

    // Helper: Get ytInitialData from page
    function getYtInitialData() {
        try {
            if (window.ytInitialData) {
                return window.ytInitialData;
            }

            // Fallback: extract from script tags
            const scripts = document.getElementsByTagName('script');
            for (let script of scripts) {
                const content = script.textContent;
                if (content.includes('var ytInitialData')) {
                    const match = content.match(/var ytInitialData = ({.*?});/s);
                    if (match) {
                        return JSON.parse(match[1]);
                    }
                }
            }
        } catch (e) {
            console.error('Failed to get ytInitialData:', e);
        }
        return null;
    }

    // Helper: Extract continuation token from ytInitialData
    function getContinuationToken(data) {
        try {
            const contents = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents;
            if (!contents) return null;

            for (let content of contents) {
                if (content.itemSectionRenderer?.sectionIdentifier === 'comment-item-section') {
                    const continuation = content.itemSectionRenderer.contents[0]?.continuationItemRenderer;
                    return continuation?.continuationEndpoint?.continuationCommand?.token;
                }
            }
        } catch (e) {
            console.error('Failed to extract continuation token:', e);
        }
        return null;
    }

    // Helper: Parse comments from API response
    function parseCommentsFromAPI(items) {
        const comments = [];

        for (let item of items) {
            try {
                if (item.commentThreadRenderer) {
                    const thread = item.commentThreadRenderer;
                    const comment = thread.comment.commentRenderer;

                    // Main comment
                    const commentData = {
                        author: comment.authorText?.simpleText || '',
                        authorChannel: comment.authorEndpoint?.browseEndpoint?.browseId || '',
                        text: comment.contentText?.runs?.map(r => r.text).join('') || '',
                        likeCount: comment.voteCount?.simpleText || '0',
                        publishedTime: comment.publishedTimeText?.runs?.[0]?.text || '',
                        replies: []
                    };

                    // Replies
                    if (thread.replies?.commentRepliesRenderer) {
                        const replies = thread.replies.commentRepliesRenderer.contents;
                        for (let reply of replies) {
                            if (reply.commentRenderer) {
                                const r = reply.commentRenderer;
                                commentData.replies.push({
                                    author: r.authorText?.simpleText || '',
                                    text: r.contentText?.runs?.map(run => run.text).join('') || '',
                                    likeCount: r.voteCount?.simpleText || '0',
                                    publishedTime: r.publishedTimeText?.runs?.[0]?.text || ''
                                });
                            }
                        }
                    }

                    comments.push(commentData);
                }
            } catch (e) {
                console.error('Failed to parse comment:', e);
            }
        }

        return comments;
    }

    // Helper: Fetch comments using continuation token
    function fetchCommentsViaAPI(continuationToken) {
        return new Promise((resolve, reject) => {
            const url = 'https://www.youtube.com/youtubei/v1/next?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

            const payload = {
                continuation: continuationToken,
                context: {
                    client: {
                        clientName: 'WEB',
                        clientVersion: '2.20251113.00.00'
                    }
                }
            };

            GM.xmlHttpRequest({
                method: 'POST',
                url: url,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(payload),
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        const items = data.onResponseReceivedEndpoints?.[0]?.reloadContinuationItemsCommand?.continuationItems ||
                                    data.onResponseReceivedEndpoints?.[1]?.appendContinuationItemsAction?.continuationItems || [];

                        const comments = parseCommentsFromAPI(items);

                        // Find next token
                        let nextToken = null;
                        for (let item of items) {
                            if (item.continuationItemRenderer) {
                                nextToken = item.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
                                break;
                            }
                        }

                        resolve({ comments, nextToken });
                    } catch (e) {
                        console.error('Failed to parse API response:', e);
                        reject(e);
                    }
                },
                onerror: function(e) {
                    console.error('API request failed:', e);
                    reject(e);
                }
            });
        });
    }

    // Helper: Recursively fetch all comments
    async function fetchAllComments(initialToken, maxComments, onProgress) {
        let allComments = [];
        let token = initialToken;

        while (token && allComments.length < maxComments) {
            try {
                const { comments, nextToken } = await fetchCommentsViaAPI(token);
                allComments = allComments.concat(comments);

                if (onProgress) {
                    onProgress(allComments.length);
                }

                token = nextToken;

                // Delay to avoid rate limiting
                if (token && allComments.length < maxComments) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            } catch (e) {
                console.error('Error fetching comments batch:', e);
                break;
            }
        }

        return allComments;
    }

    // Helper: Format comments as text
    function formatCommentsAsText(comments) {
        let text = '';
        let count = 0;

        comments.forEach(comment => {
            count++;
            text += `${count}. @${comment.author}:\n${comment.text}\n`;

            // Add replies
            comment.replies?.forEach(reply => {
                count++;
                text += `${count}. @${reply.author} (回复):\n${reply.text}\n`;
            });

            text += '\n';
        });

        return { text, count };
    }

    // Main function: Create copy comments button
    async function createCopyCommentsButton() {
        if (!USER_CONFIG.copyCommentsButton) return;

        try {
            // Wait for comments section to load
            const commentsSection = await waitForElement('ytd-comments#comments', document, 10000);
            if (!commentsSection) {
                console.log('Comments section not found');
                return;
            }

            // Try multiple selectors for comments header
            let commentsHeader = commentsSection.querySelector('#title') ||
                                commentsSection.querySelector('ytd-comments-header-renderer #title') ||
                                commentsSection.querySelector('ytd-comments-header-renderer h2') ||
                                commentsSection.querySelector('.title');

            if (!commentsHeader) {
                console.log('Comments header not found, trying count element');
                // Fallback: find the comment count element
                commentsHeader = commentsSection.querySelector('#count') ||
                               commentsSection.querySelector('.count-text') ||
                               commentsSection.querySelector('yt-formatted-string#count');
            }

            if (!commentsHeader) {
                console.log('Could not find suitable location for comments button');
                return;
            }

            // Check if button already exists
            if (document.getElementById('copy-comments-button')) {
                console.log('Copy comments button already exists');
                return;
            }

            // Create copy button
            const copyBtn = document.createElement('button');
            copyBtn.id = 'copy-comments-button';
            copyBtn.textContent = USER_CONFIG.fetchAllComments ? '📋 复制所有评论' : '📋 复制评论';
            copyBtn.title = USER_CONFIG.fetchAllComments ? 'Copy all comments via API' : 'Copy visible comments';
            copyBtn.style.cssText = `
                margin-left: 12px;
                padding: 6px 12px;
                background: transparent;
                border: 1px solid var(--yt-spec-outline);
                border-radius: 18px;
                color: var(--yt-spec-text-secondary);
                font-size: 14px;
                cursor: pointer;
                font-family: "Roboto", "Arial", sans-serif;
                font-weight: 500;
                transition: all 0.2s;
            `;

            copyBtn.addEventListener('mouseenter', () => {
                copyBtn.style.background = 'var(--yt-spec-badge-chip-background)';
            });

            copyBtn.addEventListener('mouseleave', () => {
                copyBtn.style.background = 'transparent';
            });

            let isProcessing = false;

            copyBtn.addEventListener('click', async () => {
                if (isProcessing) return;

                try {
                    isProcessing = true;
                    const originalText = copyBtn.textContent;

                    if (USER_CONFIG.fetchAllComments) {
                        // Fetch all comments via API
                        copyBtn.textContent = '⏳ 获取中...';
                        copyBtn.disabled = true;

                        const ytInitialData = getYtInitialData();
                        if (!ytInitialData) {
                            showToast('无法获取页面数据', 'error');
                            copyBtn.textContent = originalText;
                            copyBtn.disabled = false;
                            isProcessing = false;
                            return;
                        }

                        const token = getContinuationToken(ytInitialData);
                        if (!token) {
                            showToast('未找到评论数据', 'error');
                            copyBtn.textContent = originalText;
                            copyBtn.disabled = false;
                            isProcessing = false;
                            return;
                        }

                        const maxComments = USER_CONFIG.maxCommentsToFetch || 1000;

                        const allComments = await fetchAllComments(token, maxComments, (count) => {
                            copyBtn.textContent = `⏳ 已获取 ${count} 条...`;
                        });

                        if (allComments.length === 0) {
                            showToast('没有找到评论', 'error');
                            copyBtn.textContent = originalText;
                            copyBtn.disabled = false;
                            isProcessing = false;
                            return;
                        }

                        const { text: commentsText, count: totalCount } = formatCommentsAsText(allComments);

                        await navigator.clipboard.writeText(commentsText);

                        copyBtn.textContent = `✓ 已复制 ${totalCount} 条`;
                        copyBtn.style.color = 'var(--yt-spec-call-to-action)';

                        setTimeout(() => {
                            copyBtn.textContent = originalText;
                            copyBtn.style.color = 'var(--yt-spec-text-secondary)';
                            copyBtn.disabled = false;
                            isProcessing = false;
                        }, 2000);

                        showToast(`已复制 ${totalCount} 条评论（${allComments.length} 主评论）`, 'success', 3000);

                    } else {
                        // Fallback: Copy visible comments from DOM
                        const commentThreads = commentsSection.querySelectorAll('ytd-comment-thread-renderer');

                        if (commentThreads.length === 0) {
                            showToast('没有找到评论', 'error');
                            isProcessing = false;
                            return;
                        }

                        let allComments = [];
                        let commentCount = 0;

                        // Extract comments
                        commentThreads.forEach((thread, index) => {
                            // Main comment
                            const mainComment = thread.querySelector('#body #main #comment-content #content-text');
                            const authorElement = thread.querySelector('#body #main #header-author h3 a');

                            if (mainComment && authorElement) {
                                const author = authorElement.textContent.trim();
                                const text = mainComment.textContent.trim();
                                commentCount++;
                                allComments.push(`${commentCount}. @${author}:\n${text}\n`);
                            }

                            // Replies (if any)
                            const replies = thread.querySelectorAll('#replies ytd-comment-renderer');
                            replies.forEach(reply => {
                                const replyContent = reply.querySelector('#comment-content #content-text');
                                const replyAuthor = reply.querySelector('#header-author h3 a');

                                if (replyContent && replyAuthor) {
                                    const author = replyAuthor.textContent.trim();
                                    const text = replyContent.textContent.trim();
                                    commentCount++;
                                    allComments.push(`${commentCount}. @${author} (回复):\n${text}\n`);
                                }
                            });
                        });

                        const commentsText = allComments.join('\n');

                        // Copy to clipboard
                        await navigator.clipboard.writeText(commentsText);

                        copyBtn.textContent = '✓ 已复制 ' + commentCount + ' 条评论';
                        copyBtn.style.color = 'var(--yt-spec-call-to-action)';

                        setTimeout(() => {
                            copyBtn.textContent = originalText;
                            copyBtn.style.color = 'var(--yt-spec-text-secondary)';
                            isProcessing = false;
                        }, 2000);

                        showToast(`已复制 ${commentCount} 条可见评论`, 'success', 2000);
                    }

                } catch (error) {
                    console.error('Failed to copy comments:', error);
                    showToast('复制失败: ' + error.message, 'error');
                    copyBtn.textContent = USER_CONFIG.fetchAllComments ? '📋 复制所有评论' : '📋 复制评论';
                    copyBtn.disabled = false;
                    isProcessing = false;
                }
            });

            // Insert button next to comment count
            commentsHeader.appendChild(copyBtn);
            console.log('Copy comments button successfully created and inserted');

        } catch (error) {
            console.error('Failed to create copy comments button:', error);
        }
    }

    function toggleTheaterMode() {
        const event = new KeyboardEvent('keydown', {
            key: 't',
            code: 'KeyT',
            keyCode: 84,
            which: 84,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
    }

    // ==================== INITIALIZATION ====================

    async function initializeAlchemy() {
        try {
            await createTranscriptButtons();
            await createPlaybackSpeedController();
            await createTabView();
            await createCopyCommentsButton();

            // Auto theater mode
            if (USER_CONFIG.autoTheaterMode) {
                const watchFlexy = document.querySelector('ytd-watch-flexy');
                if (watchFlexy && !watchFlexy.hasAttribute('theater')) {
                    toggleTheaterMode();
                }
            }
        } catch (error) {
            console.error('YouTubeAlchemy Lite: Initialization error:', error);
        }
    }

    // Listen for YouTube navigation events
    document.addEventListener('yt-navigate-finish', () => {
        const isVideoPage = window.location.pathname === '/watch';
        if (isVideoPage) {
            setTimeout(initializeAlchemy, 1000);
        }
    });

    // Initial load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const isVideoPage = window.location.pathname === '/watch';
            if (isVideoPage) {
                setTimeout(initializeAlchemy, 1000);
            }
        });
    } else {
        const isVideoPage = window.location.pathname === '/watch';
        if (isVideoPage) {
            setTimeout(initializeAlchemy, 1000);
        }
    }

    console.log('Qiaomu\'s YouTube Script v1.5.0 loaded');
})();
