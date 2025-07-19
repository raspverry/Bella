// Transformers.js의 pipeline 가져오기
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';

document.addEventListener('DOMContentLoaded', function() {

    // --- UI 요소 DOM 참조 ---
    const topBar = document.getElementById('top-bar');
    const videoContainer = document.getElementById('video-container');
    const micButton = document.getElementById('mic-button');
    const favorabilityBar = document.getElementById('favorability-bar');
    const transcriptContainer = document.getElementById('transcript-container');
    const transcriptText = document.getElementById('transcript');
    const transcriptStatus = document.getElementById('transcript-status');
    const analysisToolButton = document.getElementById('analysis-tool-button');
    const actionMenuButton = document.getElementById('action-menu-button');
    const bottomSheet = document.getElementById('bottom-sheet');
    const menuContainer = document.getElementById('menu-container');
    const overlay = document.getElementById('overlay');
    const sentimentInput = document.getElementById('sentiment-input');
    const analyzeButton = document.getElementById('analyze-button');
    const sentimentResult = document.getElementById('sentiment-result');
    const localMicButton = document.getElementById('local-mic-button');
    const localAsrResult = document.getElementById('local-asr-result');
    
    // --- 로딩 화면 처리 ---
    const loadingScreen = document.getElementById('loading-screen');
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => loadingScreen.style.display = 'none', 500);
    }, 2000);
    
    // --- 비디오 관련 요소 ---
    let video1 = document.getElementById('video1');
    let video2 = document.getElementById('video2');
    let activeVideo = video1;
    let inactiveVideo = video2;
    const videoList = [
        'video_assets/3d_modeling_image_creation.mp4',
        'video_assets/2025-07-16-1043-smile_elegant_sway_then_chin_rest.mp4',
        'video_assets/2025-07-16-4437-v_pose_smile.mp4',
        'video_assets/cheer_video.mp4',
        'video_assets/dance_video.mp4',
        'negative/2025-07-16-9418-hands_hips_pout_angry.mp4'
    ];
    const positiveVideos = videoList.slice(1, 5);
    const negativeVideo = videoList[5];

    // --- 호감도 시스템 ---
    let favorability = 65;
    function updateFavorability(change) {
        favorability = Math.max(0, Math.min(100, favorability + change));
        favorabilityBar.style.width = favorability + '%';
        if (favorability >= 80) {
            favorabilityBar.style.background = 'linear-gradient(90deg, #4CAF50, #45a049)';
        } else if (favorability >= 50) {
            favorabilityBar.style.background = 'linear-gradient(90deg, #ff9a9e, #fecfef)';
        } else {
            favorabilityBar.style.background = 'linear-gradient(90deg, #f44336, #d32f2f)';
        }
        
        if (change !== 0) showTopBarTemporarily();
    }

    // --- UI 제어 함수 ---
    function showTopBarTemporarily(duration = 3000) {
        topBar.classList.add('visible');
        setTimeout(() => topBar.classList.remove('visible'), duration);
    }

    function toggleBottomSheet(show) {
        bottomSheet.classList.toggle('visible', show);
        overlay.classList.toggle('visible', show);
    }

    function toggleActionMenu(show) {
        menuContainer.classList.toggle('visible', show);
        overlay.classList.toggle('visible', show);
    }

    // --- 비디오 재생 로직 ---
    function switchVideo() {
        const currentVideoSrc = activeVideo.querySelector('source').getAttribute('src');
        let nextVideoSrc = currentVideoSrc;
        while (nextVideoSrc === currentVideoSrc) {
            const randomIndex = Math.floor(Math.random() * videoList.length);
            nextVideoSrc = videoList[randomIndex];
        }
        playVideo(nextVideoSrc);
    }
    
    function switchVideoByEmotion(emotion) {
        let nextVideoSrc = (emotion === 'positive') 
            ? positiveVideos[Math.floor(Math.random() * positiveVideos.length)]
            : negativeVideo;
        playVideo(nextVideoSrc);
    }

    function playVideo(src) {
        const currentSrc = activeVideo.querySelector('source').getAttribute('src');
        if (src === currentSrc) return;
        
        inactiveVideo.querySelector('source').setAttribute('src', src);
        inactiveVideo.load();
        
        inactiveVideo.addEventListener('canplaythrough', function onCanPlayThrough() {
            inactiveVideo.removeEventListener('canplaythrough', onCanPlayThrough);
            activeVideo.pause();
            inactiveVideo.play().catch(e => console.error("Video play failed", e));
            activeVideo.classList.remove('active');
            inactiveVideo.classList.add('active');
            [activeVideo, inactiveVideo] = [inactiveVideo, activeVideo];
            activeVideo.addEventListener('ended', switchVideo, { once: true });
        }, { once: true });
    }
    
    activeVideo.addEventListener('ended', switchVideo, { once: true });

    // --- 음성 인식 (Web Speech API) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.lang = 'ko-KR'; 
        recognition.interimResults = true;

        recognition.onstart = () => {
            micButton.classList.add('is-listening');
            transcriptContainer.classList.add('visible');
            transcriptText.textContent = '';
            transcriptStatus.textContent = '듣는 중...';
        };

        recognition.onend = () => {
            micButton.classList.remove('is-listening');
            if (!transcriptText.textContent) {
                 transcriptContainer.classList.remove('visible');
            }
        };

        recognition.onresult = (event) => {
            let final_transcript = '';
            let interim_transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) final_transcript += event.results[i][0].transcript;
                else interim_transcript += event.results[i][0].transcript;
            }
            transcriptText.textContent = final_transcript || interim_transcript;
            if (final_transcript) {
                transcriptStatus.textContent = '인식 완료';
                analyzeAndReact(final_transcript);
                setTimeout(() => transcriptContainer.classList.remove('visible'), 3000);
            }
        };
    }

    // --- 다국어 키워드 및 반응 분석 ---
    const keywordsByLang = {
        'ko-KR': { positive: ['기쁘다', '좋다', '사랑', '훌륭하다', '안녕', '예쁘다', '최고야', '아름다워', '귀여워'], negative: ['슬프다', '화난다', '싫다', '나쁘다', '별로야', '못생겼어'] },
        'en-US': { positive: ['happy', 'good', 'love', 'great', 'hello', 'pretty', 'beautiful', 'awesome', 'cute'], negative: ['sad', 'angry', 'hate', 'bad', 'terrible', 'ugly'] },
        'ja-JP': { positive: ['嬉しい', 'いいね', '愛してる', '素晴らしい', 'こんにちは', '可愛い', '綺麗', '最高'], negative: ['悲しい', '怒る', '嫌だ', '悪い', 'ひどい', '不細工'] },
        'zh-CN': { positive: ['高兴', '好', '爱', '太棒了', '你好', '漂亮', '可爱'], negative: ['伤心', '生气', '讨厌', '不好', '糟糕', '难看'] }
    };

    function analyzeAndReact(text) {
        const selectedLang = document.getElementById('language-select').value;
        const keywords = keywordsByLang[selectedLang];
        if (!keywords) return;
        let reaction = 'neutral';
        const lowerCaseText = text.toLowerCase();
        if (keywords.positive.some(word => lowerCaseText.includes(word))) {
            reaction = 'positive'; 
            updateFavorability(2);
        } else if (keywords.negative.some(word => lowerCaseText.includes(word))) {
            reaction = 'negative'; 
            updateFavorability(-2);
        }
        if (reaction !== 'neutral') {
            switchVideoByEmotion(reaction);
        }
    }

    // --- 이벤트 리스너 설정 ---
    let isListening = false;
    micButton.addEventListener('click', () => {
        if (!SpeechRecognition) return showNotification('브라우저가 음성 인식을 지원하지 않습니다.', 'error');
        isListening = !isListening;
        if (isListening) {
            recognition.lang = document.getElementById('language-select').value;
            recognition.start();
        } else {
            recognition.stop();
        }
    });

    videoContainer.addEventListener('click', () => showTopBarTemporarily());

    analysisToolButton.addEventListener('click', () => toggleBottomSheet(true));
    actionMenuButton.addEventListener('click', () => toggleActionMenu(true));
    overlay.addEventListener('click', () => {
        toggleBottomSheet(false);
        toggleActionMenu(false);
    });
    
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            playVideo(this.getAttribute('data-video'));
            toggleActionMenu(false);
        });
    });

    // --- AI 분석 도구 (바텀 시트 내부) ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });

    // --- 언어 설정 드롭다운 이벤트 ---
    const languageSelect = document.getElementById('language-select');
    languageSelect.addEventListener('change', function() {
        const selectedLang = this.value;
        if (recognition) {
            recognition.lang = selectedLang;
        }
        showNotification(`언어가 ${this.options[this.selectedIndex].text}로 변경되었습니다.`, 'success');
    });

    // 감정 분석 (Transformers.js)
    let classifier;
    analyzeButton.addEventListener('click', async () => {
        const text = sentimentInput.value;
        if (!text) {
            showNotification('분석할 텍스트를 입력해주세요.', 'warning');
            return;
        }
        
        sentimentResult.textContent = '분석 중...';
        analyzeButton.disabled = true;
        
        if (!classifier) {
            try {
                classifier = await pipeline('sentiment-analysis');
            } catch (error) {
                console.error("Sentiment analysis model failed to load", error);
                sentimentResult.textContent = '모델 로딩 실패';
                analyzeButton.disabled = false;
                showNotification('감정 분석 모델 로딩에 실패했습니다.', 'error');
                return;
            }
        }
        
        try {
            const result = await classifier(text);
            const primaryEmotion = result[0];
            sentimentResult.textContent = `감정: ${primaryEmotion.label}, 점수: ${primaryEmotion.score.toFixed(2)}`;
            if (primaryEmotion.label === 'POSITIVE') updateFavorability(3);
            else if (primaryEmotion.label === 'NEGATIVE') updateFavorability(-3);
        } catch (error) {
            console.error("Sentiment analysis failed", error);
            sentimentResult.textContent = '분석 중 오류 발생';
        } finally {
            analyzeButton.disabled = false;
        }
    });

    // 로컬 음성 인식 (Transformers.js)
    let recognizer = null;
    let mediaRecorder = null;
    let isLocalRecording = false;

    localMicButton.addEventListener('click', async () => {
        if (isLocalRecording) {
            mediaRecorder.stop();
            return;
        }

        if (!recognizer) {
            localAsrResult.textContent = '음성 모델 로딩 중...';
            localMicButton.disabled = true;
            try {
                recognizer = await pipeline('automatic-speech-recognition');
                localAsrResult.textContent = '모델 로딩 완료. 녹음을 시작하세요.';
            } catch (error) {
                console.error("ASR model failed to load", error);
                localAsrResult.textContent = '모델 로딩 실패';
                showNotification('음성 인식 모델 로딩에 실패했습니다.', 'error');
                return;
            } finally {
                localMicButton.disabled = false;
            }
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];

            mediaRecorder.addEventListener("dataavailable", event => audioChunks.push(event.data));
            mediaRecorder.addEventListener("stop", async () => {
                isLocalRecording = false;
                localMicButton.innerHTML = '<i class="fas fa-play"></i> 음성 인식 시작';
                stream.getTracks().forEach(track => track.stop());

                const audioBlob = new Blob(audioChunks);
                const arrayBuffer = await audioBlob.arrayBuffer();
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                if (arrayBuffer.byteLength === 0) return;

                localAsrResult.textContent = '인식 중...';
                try {
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    const rawAudio = audioBuffer.getChannelData(0);
                    const output = await recognizer(rawAudio);
                    localAsrResult.textContent = output.text || '인식된 내용이 없습니다.';
                } catch(e) {
                    console.error('Audio processing failed:', e);
                    localAsrResult.textContent = '오디오 처리 오류.';
                    showNotification('오디오 처리에 실패했습니다.', 'error');
                }
            });

            mediaRecorder.start();
            isLocalRecording = true;
            localMicButton.innerHTML = '<i class="fas fa-stop"></i> 녹음 중지';
        } catch (error) {
            console.error('Could not start recording', error);
            showNotification('마이크에 접근할 수 없습니다.', 'error');
        }
    });


    // --- 알림 시스템 ---
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i><span>${message}</span>`;
        // mobile-view-wrapper 내부에 추가하여 위치를 맞춤
        document.getElementById('mobile-view-wrapper').appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.parentNode.removeChild(notification), 500);
        }, 3000);
    }

    // --- 초기화 ---
    updateFavorability(0);
    showTopBarTemporarily(4000);
});