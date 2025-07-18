// Transformers.js의 pipeline 가져오기
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';

document.addEventListener('DOMContentLoaded', function() {

    // --- 탭 인터페이스 기능 ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // 모든 탭 버튼 비활성화
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // 모든 탭 콘텐츠 숨기기
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 클릭된 탭 활성화
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            // 탭 전환 알림
            const tabName = button.textContent.trim();
            showNotification(`${tabName} 탭으로 전환되었습니다.`, 'info');
        });
    });

    // --- 로딩 화면 처리 ---
    const loadingScreen = document.getElementById('loading-screen');
    const loadingText = document.querySelector('.loading-text');
    const loadingSpinner = document.querySelector('.loading-spinner');
    
    // 로딩 진행률 시뮬레이션
    let loadingProgress = 0;
    const loadingInterval = setInterval(() => {
        loadingProgress += Math.random() * 15;
        if (loadingProgress >= 100) {
            loadingProgress = 100;
            clearInterval(loadingInterval);
        }
        loadingText.textContent = `벨라를 준비하고 있습니다... ${Math.round(loadingProgress)}%`;
    }, 200);

    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }, 2000);
    
    // 필요한 DOM 요소 가져오기
    let video1 = document.getElementById('video1');
    let video2 = document.getElementById('video2');
    const micButton = document.getElementById('mic-button');
    const favorabilityBar = document.getElementById('favorability-bar');
    const floatingButton = document.getElementById('floating-button');
    const menuContainer = document.getElementById('menu-container');
    const menuItems = document.querySelectorAll('.menu-item');

    // --- 감정 분석 요소 ---
    const sentimentInput = document.getElementById('sentiment-input');
    const analyzeButton = document.getElementById('analyze-button');
    const sentimentResult = document.getElementById('sentiment-result');

    let activeVideo = video1;
    let inactiveVideo = video2;

    // 비디오 목록
    const videoList = [
        'video_assets/3d_modeling_image_creation.mp4',
        'video_assets/2025-07-16-1043-smile_elegant_sway_then_chin_rest.mp4',
        'video_assets/2025-07-16-4437-v_pose_smile.mp4',
        'video_assets/cheer_video.mp4',
        'video_assets/dance_video.mp4',
        'negative/2025-07-16-9418-hands_hips_pout_angry.mp4'
    ];

    // --- 호감도 시스템 ---
    let favorability = 65;
    
    function updateFavorability(change) {
        favorability = Math.max(0, Math.min(100, favorability + change));
        favorabilityBar.style.width = favorability + '%';
        
        // 호감도에 따른 색상 변화
        if (favorability >= 80) {
            favorabilityBar.style.background = 'linear-gradient(90deg, #4CAF50, #45a049)';
        } else if (favorability >= 50) {
            favorabilityBar.style.background = 'linear-gradient(90deg, #ff9a9e, #fecfef)';
        } else {
            favorabilityBar.style.background = 'linear-gradient(90deg, #f44336, #d32f2f)';
        }
    }

    // --- 비디오 크로스페이드 재생 기능 ---
    function switchVideo() {
        // 1. 다음 비디오 선택
        const currentVideoSrc = activeVideo.querySelector('source').getAttribute('src');
        let nextVideoSrc = currentVideoSrc;
        while (nextVideoSrc === currentVideoSrc) {
            const randomIndex = Math.floor(Math.random() * videoList.length);
            nextVideoSrc = videoList[randomIndex];
        }

        // 2. 비활성 video 요소의 source 설정
        inactiveVideo.querySelector('source').setAttribute('src', nextVideoSrc);
        inactiveVideo.load();

        // 3. 비활성 비디오가 재생 가능할 때 전환 실행
        inactiveVideo.addEventListener('canplaythrough', function onCanPlayThrough() {
            // 이벤트가 한 번만 트리거되도록 보장
            inactiveVideo.removeEventListener('canplaythrough', onCanPlayThrough);

            // 4. 새 비디오 재생
            inactiveVideo.play().catch(error => {
                console.error("비디오 재생 실패:", error);
            });

            // 5. active 클래스 전환으로 CSS 전환 트리거
            activeVideo.classList.remove('active');
            inactiveVideo.classList.add('active');

            // 6. 역할 업데이트
            [activeVideo, inactiveVideo] = [inactiveVideo, activeVideo];

            // 새로운 activeVideo에 ended 이벤트 바인딩
            activeVideo.addEventListener('ended', switchVideo, { once: true });
        }, { once: true }); // { once: true }를 사용하여 이벤트가 한 번만 처리되도록 보장
    }

    // 초기 시작
    activeVideo.addEventListener('ended', switchVideo, { once: true });

    // --- 음성 인식 핵심 ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    // 브라우저가 음성 인식을 지원하는지 확인
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true; // 지속적 인식
        recognition.lang = 'zh-CN'; // 언어를 중국어로 설정
        recognition.interimResults = true; // 임시 결과 가져오기

        recognition.onresult = (event) => {
            const transcriptContainer = document.getElementById('transcript');
            let final_transcript = '';
            let interim_transcript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final_transcript += event.results[i][0].transcript;
                } else {
                    interim_transcript += event.results[i][0].transcript;
                }
            }
            
            // 최종 인식 결과 표시
            transcriptContainer.textContent = final_transcript || interim_transcript;
            
            // 키워드 기반 감정 분석 및 비디오 전환
            if (final_transcript) {
                analyzeAndReact(final_transcript);
            }
        };

        recognition.onerror = (event) => {
            console.error('음성 인식 오류:', event.error);
        };

    } else {
        console.log('브라우저가 음성 인식 기능을 지원하지 않습니다.');
        // 사용자에게 인터페이스에서 알림을 줄 수 있음
    }

    // --- 마이크 버튼 상호작용 ---
    let isListening = false;

    micButton.addEventListener('click', function() {
        if (!SpeechRecognition) {
            showNotification('브라우저가 음성 인식을 지원하지 않습니다.', 'error');
            return;
        }

        isListening = !isListening;
        micButton.classList.toggle('is-listening', isListening);
        const transcriptContainer = document.querySelector('.transcript-container');
        const transcriptText = document.getElementById('transcript');

        if (isListening) {
            transcriptText.textContent = '듣는 중...';
            transcriptContainer.classList.add('visible');
            recognition.start();
            showNotification('음성 인식이 시작되었습니다.', 'success');
        } else {
            recognition.stop();
            transcriptContainer.classList.remove('visible');
            transcriptText.textContent = '';
            showNotification('음성 인식이 중지되었습니다.', 'info');
        }
    });

    // --- 플로팅 버튼 상호작용 ---
    floatingButton.addEventListener('click', (event) => {
        event.stopPropagation(); // document로의 이벤트 버블링 방지
        menuContainer.classList.toggle('hidden');
    });

    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const videoSrc = this.getAttribute('data-video');
            const actionName = this.textContent.trim();
            playSpecificVideo(videoSrc);
            menuContainer.classList.add('hidden');
            showNotification(`${actionName} 액션이 실행되었습니다!`, 'success');
        });
    });

    // 메뉴 외부 영역 클릭 시 메뉴 닫기
    document.addEventListener('click', () => {
        if (!menuContainer.classList.contains('hidden')) {
            menuContainer.classList.add('hidden');
        }
    });

    // 메뉴 자체의 클릭 이벤트 버블링 방지
    menuContainer.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    function playSpecificVideo(videoSrc) {
        const currentVideoSrc = activeVideo.querySelector('source').getAttribute('src');
        if (videoSrc === currentVideoSrc) return;

        inactiveVideo.querySelector('source').setAttribute('src', videoSrc);
        inactiveVideo.load();

        inactiveVideo.addEventListener('canplaythrough', function onCanPlayThrough() {
            inactiveVideo.removeEventListener('canplaythrough', onCanPlayThrough);
            activeVideo.pause(); // 현재 비디오 일시정지하여 'ended' 이벤트가 전환을 트리거하지 않도록 방지
            inactiveVideo.play().catch(error => console.error("비디오 재생 실패:", error));
            activeVideo.classList.remove('active');
            inactiveVideo.classList.add('active');
            [activeVideo, inactiveVideo] = [inactiveVideo, activeVideo];
            activeVideo.addEventListener('ended', switchVideo, { once: true });
        }, { once: true });
    }

    // --- 감정 분석 및 반응 ---
    const positiveWords = ['기쁘다', '좋다', '사랑한다', '훌륭하다', '안녕', '예쁘다'];
    const negativeWords = ['슬프다', '화나다', '싫다', '슬프다'];

    const positiveVideos = [
        'video_assets/2025-07-16-1043-smile_elegant_sway_then_chin_rest.mp4',
        'video_assets/2025-07-16-4437-v_pose_smile.mp4',
        'video_assets/cheer_video.mp4',
        'video_assets/dance_video.mp4'
    ];
    const negativeVideo = 'negative/2025-07-16-9418-hands_hips_pout_angry.mp4';

    // --- 로컬 모델 감정 분석 ---
    let classifier;
    analyzeButton.addEventListener('click', async () => {
        const text = sentimentInput.value;
        if (!text) {
            showNotification('분석할 텍스트를 입력해주세요.', 'warning');
            return;
        }

        sentimentResult.textContent = '분석 중...';
        analyzeButton.disabled = true;
        analyzeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 분석 중...';

        // 첫 번째 클릭 시 분류기 초기화
        if (!classifier) {
            try {
                // 모델 로딩 시도
                classifier = await pipeline('sentiment-analysis');
                sentimentResult.textContent = '모델 로딩 완료!';
            } catch (error) {
                console.error('모델 로딩 실패:', error);
                sentimentResult.textContent = '모델 로딩에 실패했습니다. 기본 분석을 사용합니다.';
                
                // 기본 키워드 기반 분석으로 대체
                const positiveKeywords = ['happy', 'good', 'great', 'love', 'like', 'wonderful', 'amazing'];
                const negativeKeywords = ['sad', 'bad', 'terrible', 'hate', 'awful', 'horrible'];
                
                const lowerText = text.toLowerCase();
                let emotion = 'neutral';
                let score = 0.5;
                
                if (positiveKeywords.some(keyword => lowerText.includes(keyword))) {
                    emotion = 'POSITIVE';
                    score = 0.8;
                    updateFavorability(5);
                } else if (negativeKeywords.some(keyword => lowerText.includes(keyword))) {
                    emotion = 'NEGATIVE';
                    score = 0.2;
                    updateFavorability(-5);
                }
                
                sentimentResult.textContent = `감정: ${emotion}, 점수: ${score.toFixed(2)} (기본 분석)`;
                analyzeButton.disabled = false;
                analyzeButton.innerHTML = '<i class="fas fa-brain"></i> 분석하기';
                return;
            }
        }

        // AI 모델을 사용한 감정 분석
        try {
            const result = await classifier(text);
            const primaryEmotion = result[0];
            sentimentResult.textContent = `감정: ${primaryEmotion.label}, 점수: ${primaryEmotion.score.toFixed(2)}`;
            
            // 감정에 따른 호감도 변화
            if (primaryEmotion.label === 'POSITIVE') {
                updateFavorability(3);
            } else if (primaryEmotion.label === 'NEGATIVE') {
                updateFavorability(-3);
            }
            
            showNotification('감정 분석이 완료되었습니다!', 'success');
        } catch (error) {
            console.error('감정 분석 실패:', error);
            sentimentResult.textContent = '분석 중 오류가 발생했습니다.';
            showNotification('감정 분석 중 오류가 발생했습니다.', 'error');
        }
        
        analyzeButton.disabled = false;
        analyzeButton.innerHTML = '<i class="fas fa-brain"></i> 분석하기';
    });

    // --- 로컬 음성 인식 --- //
    const localMicButton = document.getElementById('local-mic-button');
    const localAsrResult = document.getElementById('local-asr-result');

    let recognizer = null;
    let mediaRecorder = null;
    let isRecording = false;

    const handleRecord = async () => {
        // 상태 전환: 녹음 중이면 중지
        if (isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            localMicButton.textContent = '음성 인식 시작';
            localMicButton.classList.remove('recording');
            return;
        }

        // 모델 초기화 (한 번만)
        if (!recognizer) {
            localAsrResult.textContent = '음성 인식 모델을 로딩 중...';
            try {
                // 음성 인식 모델 로딩 시도
                recognizer = await pipeline('automatic-speech-recognition');
                localAsrResult.textContent = '모델 로딩 완료, 말씀해주세요...';
            } catch (error) {
                console.error('음성 인식 모델 로딩 실패:', error);
                localAsrResult.textContent = '음성 인식 모델 로딩에 실패했습니다.';
                showNotification('음성 인식 모델 로딩에 실패했습니다.', 'error');
                return;
            }
        }

        // 녹음 시작
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];

            mediaRecorder.addEventListener("dataavailable", event => {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener("stop", async () => {
                const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                const arrayBuffer = await audioBlob.arrayBuffer();
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // 오디오 데이터가 비어있는지 확인
                if (arrayBuffer.byteLength === 0) {
                    localAsrResult.textContent = '오디오가 녹음되지 않았습니다. 다시 시도해주세요.';
                    return;
                }

                try {
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    const rawAudio = audioBuffer.getChannelData(0);
    
                    localAsrResult.textContent = '인식 중...';
                    const output = await recognizer(rawAudio);
                    localAsrResult.textContent = output.text || '인식할 수 있는 내용이 없습니다.';
                    
                    if (output.text) {
                        showNotification('음성 인식이 완료되었습니다!', 'success');
                    }
                } catch(e) {
                    console.error('오디오 디코딩 또는 인식 실패:', e);
                    localAsrResult.textContent = '오디오 처리 중 오류가 발생했습니다. 다시 시도해주세요.';
                    showNotification('오디오 처리 중 오류가 발생했습니다.', 'error');
                }
            });

            mediaRecorder.start();
            isRecording = true;
            localMicButton.textContent = '녹음 중... 클릭하여 중지';
            localMicButton.classList.add('recording');
            showNotification('음성 녹음이 시작되었습니다.', 'info');

        } catch (error) {
            console.error('음성 인식 실패:', error);
            localAsrResult.textContent = '마이크에 접근할 수 없거나 인식 중 오류가 발생했습니다.';
            isRecording = false; // 상태 재설정
            localMicButton.textContent = '음성 인식 시작';
            localMicButton.classList.remove('recording');
            showNotification('마이크 접근 권한이 필요합니다.', 'error');
        }
    };

    localMicButton.addEventListener('click', handleRecord);

    // --- 알림 시스템 ---
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // 애니메이션 효과
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // 자동 제거
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    function analyzeAndReact(text) {
        let reaction = 'neutral'; // 기본값은 중성

        if (positiveWords.some(word => text.includes(word))) {
            reaction = 'positive';
            updateFavorability(2);
        } else if (negativeWords.some(word => text.includes(word))) {
            reaction = 'negative';
            updateFavorability(-2);
        }

        if (reaction !== 'neutral') {
            switchVideoByEmotion(reaction);
        }
    }

    function switchVideoByEmotion(emotion) {
        let nextVideoSrc;
        if (emotion === 'positive') {
            const randomIndex = Math.floor(Math.random() * positiveVideos.length);
            nextVideoSrc = positiveVideos[randomIndex];
        } else { // negative
            nextVideoSrc = negativeVideo;
        }

        // 같은 비디오 반복 재생 방지
        const currentVideoSrc = activeVideo.querySelector('source').getAttribute('src');
        if (nextVideoSrc === currentVideoSrc) return;

        // --- 다음 로직은 switchVideo 함수와 유사하며, 비디오 전환에 사용됨 ---
        inactiveVideo.querySelector('source').setAttribute('src', nextVideoSrc);
        inactiveVideo.load();

        inactiveVideo.addEventListener('canplaythrough', function onCanPlayThrough() {
            inactiveVideo.removeEventListener('canplaythrough', onCanPlayThrough);
            activeVideo.pause(); // 현재 비디오 일시정지하여 'ended' 이벤트가 전환을 트리거하지 않도록 방지
            inactiveVideo.play().catch(error => console.error("비디오 재생 실패:", error));
            activeVideo.classList.remove('active');
            inactiveVideo.classList.add('active');
            [activeVideo, inactiveVideo] = [inactiveVideo, activeVideo];
            // 감정으로 트리거된 비디오 재생 종료 후, 랜덤 재생으로 복귀
            activeVideo.addEventListener('ended', switchVideo, { once: true });
        }, { once: true });
    }

    // --- 키보드 단축키 ---
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && document.activeElement === sentimentInput) {
            analyzeButton.click();
        }
        if (event.key === ' ' && !event.target.matches('input, textarea')) {
            event.preventDefault();
            micButton.click();
        }
    });

    // --- 초기 설정 ---
    updateFavorability(0); // 초기 호감도 설정

});