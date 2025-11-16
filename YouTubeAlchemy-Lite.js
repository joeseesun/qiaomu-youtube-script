// ==UserScript==
// @name         YouTube Alchemy Lite
// @description  Simplified YouTube enhancement: transcript export, playback speed control, and tab view layout. Stripped down from 200+ features to just the essentials.
// @author       Simplified by Claude (Based on Tim Macy's YouTube Alchemy)
// @license      AGPL-3.0-or-later
// @version      1.1.0
// @namespace    YouTubeAlchemyLite
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @match        https://*.youtube.com/*
// @grant        GM.setValue
// @grant        GM.getValue
// @run-at       document-start
// @noframes
// @homepageURL  https://github.com/TimMacy/YouTubeAlchemy
// ==/UserScript==

/************************************************************************
*                                                                       *
*   YouTube Alchemy Lite - Simplified Fork                             *
*   Original: Copyright © 2025 Tim Macy                                 *
*   This version: Stripped to 3 core features only                     *
*                                                                       *
*   Kept features:                                                     *
*   1. Transcript Export (NotebookLM/ChatGPT/Download/Copy)            *
*   2. Playback Speed Control (0.25x-17x, keyboard shortcuts)          *
*   3. Tab View Layout (Theater mode + tabs for comments/chapters)     *
*                                                                       *
*   Removed: 180+ other features (UI hiding, color coding, etc.)       *
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
            download: '↓',
            copy: '',
            ChatGPT: '💬',
            NotebookLM: '🎧'
        },

        // Playback Speed Control
        playbackSpeed: true,
        playbackSpeedBtns: true,  // Changed: default to true, show common presets
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
            gap: 6px;
            margin-right: 8px;
        }

        .CentAnni-button-wrapper button {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 8px 12px;
            cursor: pointer;
            background-color: transparent;
            color: var(--yt-spec-text-primary, #f1f1f1);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 18px;
            font-family: "Roboto", "Arial", sans-serif;
            font-size: 14px;
            font-weight: 500;
            transition: all .15s cubic-bezier(0.05, 0, 0, 1);
            white-space: nowrap;
        }

        .CentAnni-button-wrapper button svg {
            display: block;
            flex-shrink: 0;
        }

        .CentAnni-button-wrapper button:hover {
            background-color: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
        }

        .CentAnni-button-wrapper button:active {
            background-color: rgba(255, 255, 255, 0.15);
            transform: translateY(0);
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

        /* ===== TOOLTIP SYSTEM ===== */
        .CentAnni-tooltip {
            position: absolute;
            bottom: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%);
            padding: 6px 10px;
            background-color: rgba(28, 28, 28, 0.95);
            color: #fff;
            font-size: 12px;
            font-weight: 400;
            line-height: 1.4;
            white-space: nowrap;
            border-radius: 4px;
            pointer-events: none;
            opacity: 0;
            visibility: hidden;
            transition: opacity .2s, visibility .2s;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .CentAnni-tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 5px solid transparent;
            border-top-color: rgba(28, 28, 28, 0.95);
        }

        button:hover .CentAnni-tooltip,
        span:hover .CentAnni-tooltip {
            opacity: 1;
            visibility: visible;
        }

        html:not([dark]) .CentAnni-tooltip {
            background-color: rgba(240, 240, 240, 0.98);
            color: #030303;
        }

        html:not([dark]) .CentAnni-tooltip::after {
            border-top-color: rgba(240, 240, 240, 0.98);
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

        .CentAnni-playback-control {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            background-color: rgba(28, 28, 28, .9);
            border-radius: 4px;
        }

        .CentAnni-playback-control button {
            padding: 4px 12px;
            cursor: pointer;
            background-color: hsl(0, 0%, 15%);
            color: white;
            border: 1px solid hsl(0, 0%, 30%);
            border-radius: 3px;
            font-size: 14px;
            transition: background-color .2s;
        }

        .CentAnni-playback-control button:hover {
            background-color: hsl(0, 0%, 25%);
        }

        .CentAnni-playback-control button:active {
            background-color: hsl(0, 0%, 35%);
        }

        #CentAnni-speed-display {
            min-width: 50px;
            text-align: center;
            color: white;
            font-weight: 500;
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

    // ==================== SVG ICONS (Lucide Icons - MIT License) ====================

    const ICONS = {
        download: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,

        copy: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,

        messageSquare: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,

        bookOpen: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,

        minus: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,

        plus: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,

        scroll: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><line x1="12" y1="20" x2="12" y2="10"/><polyline points="8 14 12 10 16 14"/></svg>`
    };

    function createIcon(iconName, size = 18) {
        const iconData = ICONS[iconName];
        if (!iconData) return null;

        // Use <template> innerHTML to bypass Trusted Types CSP
        // template.innerHTML is exempt from CSP restrictions
        const template = document.createElement('template');
        template.innerHTML = iconData;
        const svgElement = template.content.firstElementChild;

        if (!svgElement) return null;

        // Set custom size
        svgElement.setAttribute('width', size);
        svgElement.setAttribute('height', size);

        return svgElement;
    }

    function createTooltip(text) {
        const tooltip = document.createElement('span');
        tooltip.classList.add('CentAnni-tooltip');
        tooltip.textContent = text;
        return tooltip;
    }

    function createButton(config) {
        const { id, icon, tooltip, onClick, className = '' } = config;

        const button = document.createElement('button');
        if (id) button.id = id;
        if (className) button.className = className;

        // Add icon (using DOM API, not innerHTML - CSP safe)
        if (icon) {
            const iconElement = createIcon(icon);
            if (iconElement) {
                button.appendChild(iconElement);
            }
        }

        // Add tooltip
        if (tooltip) {
            button.appendChild(createTooltip(tooltip));
        }

        // Add click handler
        if (onClick) {
            button.addEventListener('click', onClick);
        }

        return button;
    }

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
        const downloadBtn = createButton({
            id: 'transcript-download-button',
            icon: 'download',
            tooltip: 'Download Transcript',
            onClick: () => downloadTranscript()
        });
        buttonWrapper.appendChild(downloadBtn);

        // Copy button
        const copyBtn = createButton({
            id: 'transcript-copy-button',
            icon: 'copy',
            tooltip: 'Copy to Clipboard',
            onClick: () => copyTranscript()
        });
        buttonWrapper.appendChild(copyBtn);

        // ChatGPT button
        if (USER_CONFIG.targetChatGPTUrl) {
            const chatGPTBtn = createButton({
                id: 'transcript-ChatGPT-button',
                icon: 'messageSquare',
                tooltip: `Send to ${USER_CONFIG.targetChatGPTLabel || 'ChatGPT'}`,
                onClick: () => sendToChatGPT()
            });
            buttonWrapper.appendChild(chatGPTBtn);
        }

        // NotebookLM button
        if (USER_CONFIG.targetNotebookLMUrl) {
            const notebookBtn = createButton({
                id: 'transcript-NotebookLM-button',
                icon: 'bookOpen',
                tooltip: `Send to ${USER_CONFIG.targetNotebookLMLabel || 'NotebookLM'}`,
                onClick: () => sendToNotebookLM()
            });
            buttonWrapper.appendChild(notebookBtn);
        }

        // Lazy load button (if enabled) - placed at the end
        if (USER_CONFIG.lazyTranscriptLoading) {
            const lazyBtn = createButton({
                id: 'transcript-lazy-button',
                icon: 'scroll',
                tooltip: 'Load Transcript',
                onClick: loadTranscript
            });
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
            showNotification('Loading transcript...');
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

            showNotification('Transcript downloaded!');
        } catch (error) {
            showNotification(error.message, 3000);
            console.error('Download error:', error);
        }
    }

    async function copyTranscript() {
        try {
            const transcriptText = getTranscriptText();
            const { title, channelName } = getVideoInfo();

            const content = `Title: ${title}\nChannel: ${channelName}\nURL: ${window.location.href}\n\n${transcriptText}`;

            await navigator.clipboard.writeText(content);
            showNotification('Transcript copied to clipboard!');
        } catch (error) {
            showNotification(error.message, 3000);
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

            showNotification('Transcript copied! Opening ChatGPT...');
        } catch (error) {
            showNotification(error.message, 3000);
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

            showNotification('Transcript copied! Opening NotebookLM...');
        } catch (error) {
            showNotification(error.message, 3000);
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

        const minusBtn = createButton({
            icon: 'minus',
            tooltip: 'Decrease speed (a)',
            onClick: () => setSpeed(video.playbackRate - 0.25)
        });

        const speedDisplay = document.createElement('span');
        speedDisplay.id = 'CentAnni-speed-display';
        speedDisplay.textContent = `${video.playbackRate.toFixed(2)}x`;

        // Add tooltip to speed display
        const speedTooltip = createTooltip('s: Toggle 1x | a: - | d: +');
        speedDisplay.style.position = 'relative';
        speedDisplay.style.cursor = 'help';
        speedDisplay.appendChild(speedTooltip);

        const plusBtn = createButton({
            icon: 'plus',
            tooltip: 'Increase speed (d)',
            onClick: () => setSpeed(video.playbackRate + 0.25)
        });

        controlDiv.appendChild(minusBtn);
        controlDiv.appendChild(speedDisplay);
        controlDiv.appendChild(plusBtn);
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
        // Only show most commonly used speeds (not all 16)
        const speeds = [1, 1.25, 1.5, 2, 3];

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
        const h3 = document.createElement('h3');
        h3.textContent = 'Video Sections';
        headerDiv.appendChild(h3);
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
        secondary.textContent = '';
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

    console.log('YouTube Alchemy Lite v1.1.0 loaded');
})();
