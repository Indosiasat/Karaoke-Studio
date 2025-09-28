
import { GoogleGenAI, Type } from "@google/genai";

// --- UIElement References ---
const uploader = document.getElementById('uploader') as HTMLDivElement;
const fileInput = document.getElementById('file-upload') as HTMLInputElement;
const fileUploadText = document.getElementById('file-upload-text') as HTMLSpanElement;
const urlInput = document.getElementById('url-input') as HTMLInputElement;
const loadUrlBtn = document.getElementById('load-url-btn') as HTMLButtonElement;
const urlError = document.getElementById('url-error') as HTMLParagraphElement;
const resultSection = document.getElementById('result-section') as HTMLDivElement;
const audioPlayer = document.getElementById('audio-player') as HTMLAudioElement;
const originalVideoPlayer = document.getElementById('original-video-player') as HTMLVideoElement;
const backgroundVideoPlayer = document.getElementById('background-video-player') as HTMLVideoElement;
const backgroundMusicPlayer = document.getElementById('background-music-player') as HTMLAudioElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const lyricsContainer = document.getElementById('lyrics-container') as HTMLDivElement;
const downloadSection = document.getElementById('download-section') as HTMLDivElement;
const downloadTxtBtn = document.getElementById('download-txt-btn') as HTMLButtonElement;
const downloadLrcBtn = document.getElementById('download-lrc-btn') as HTMLButtonElement;
const downloadSrtBtn = document.getElementById('download-srt-btn') as HTMLButtonElement;
const vocalRemoverSection = document.getElementById('vocal-remover-section') as HTMLDivElement;
const removeVocalsBtn = document.getElementById('remove-vocals-btn') as HTMLButtonElement;
const playOriginalBtn = document.getElementById('play-original-btn') as HTMLButtonElement;
// Transcription Settings UI
const transcriptionSettings = document.getElementById('transcription-settings') as HTMLDivElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const speakerIdCheckbox = document.getElementById('speaker-id-checkbox') as HTMLInputElement;
const retranscribeBtn = document.getElementById('retranscribe-btn') as HTMLButtonElement;
// Audio Studio UI
const audioStudio = document.getElementById('audio-studio') as HTMLDivElement;
const pitchSlider = document.getElementById('pitch-slider') as HTMLInputElement;
const pitchValue = document.getElementById('pitch-value') as HTMLSpanElement;
const reverbSlider = document.getElementById('reverb-slider') as HTMLInputElement;
const reverbValue = document.getElementById('reverb-value') as HTMLSpanElement;
const bgMusicInput = document.getElementById('bg-music-input') as HTMLInputElement;
const balanceSlider = document.getElementById('balance-slider') as HTMLInputElement;
const balanceValue = document.getElementById('balance-value') as HTMLSpanElement;
// Karaoke Studio UI
const karaokeStudio = document.getElementById('karaoke-studio') as HTMLDivElement;
const bgColorInput = document.getElementById('bg-color-input') as HTMLInputElement;
const bgImageInput = document.getElementById('bg-image-input') as HTMLInputElement;
const bgVideoInput = document.getElementById('bg-video-input') as HTMLInputElement;
const originalVideoBgOption = document.getElementById('original-video-bg-option') as HTMLDivElement;
const fontSelect = document.getElementById('font-select') as HTMLSelectElement;
const unsungColorInput = document.getElementById('unsung-color-input') as HTMLInputElement;
const sungColorInput = document.getElementById('sung-color-input') as HTMLInputElement;
const resolutionSelect = document.getElementById('resolution-select') as HTMLSelectElement;
const fpsSelect = document.getElementById('fps-select') as HTMLSelectElement;
// Karaoke Creation UI
const createKaraokeBtn = document.getElementById('create-karaoke-btn') as HTMLButtonElement;
const renderingProgress = document.getElementById('rendering-progress') as HTMLDivElement;
const renderingStatus = document.getElementById('rendering-status') as HTMLParagraphElement;
const renderingProgressBar = document.getElementById('rendering-progress-bar') as HTMLProgressElement;
const videoDownloadSection = document.getElementById('video-download-section') as HTMLDivElement;
const downloadVideoLink = document.getElementById('download-video-link') as HTMLAnchorElement;
const karaokeCanvas = document.getElementById('karaoke-canvas') as HTMLCanvasElement;

// --- State Variables ---
let ai: GoogleGenAI;
let lyrics: { startTime: number, endTime: number, text: string }[] = [];
let originalFile: File | null = null;
let originalAudioBuffer: AudioBuffer | null = null;
let instrumentalAudioBuffer: AudioBuffer | null = null;
let backgroundMusicBuffer: AudioBuffer | null = null;
let isInstrumental = false;
let backgroundImage: HTMLImageElement | null = null;
let backgroundVideo: File | null = null;
// Web Audio API nodes for real-time playback
let audioContext: AudioContext | null = null;
let instrumentalAudioSourceNode: AudioBufferSourceNode | null = null;
let backgroundMusicSourceNode: AudioBufferSourceNode | null = null;
let mainGainNode: GainNode | null = null;
let bgGainNode: GainNode | null = null;
let reverbNode: ConvolverNode | null = null;
let isPlayingAudioContext = false;


// --- Functions ---

/**
 * Initializes the application and sets up event listeners.
 */
function init() {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  // Uploader event listeners
  uploader.addEventListener('dragover', (e) => e.preventDefault());
  uploader.addEventListener('drop', handleDrop);
  fileInput.addEventListener('change', handleFileChange);
  loadUrlBtn.addEventListener('click', handleUrlLoad);

  // Player event listener
  audioPlayer.addEventListener('timeupdate', syncLyrics);
  audioPlayer.addEventListener('play', () => {
    if (isPlayingAudioContext) stopAudioContext();
  });


  // Download buttons
  downloadTxtBtn.addEventListener('click', () => downloadFile(generateTxt(), 'lyrics.txt', 'text/plain'));
  downloadLrcBtn.addEventListener('click', () => downloadFile(generateLrc(), 'lyrics.lrc', 'application/octet-stream'));
  downloadSrtBtn.addEventListener('click', () => downloadFile(generateSrt(), 'lyrics.srt', 'application/octet-stream'));

  // Vocal remover
  removeVocalsBtn.addEventListener('click', removeVocals);
  playOriginalBtn.addEventListener('click', togglePlayback);

  // Transcription Settings
  retranscribeBtn.addEventListener('click', () => {
      if (originalAudioBuffer) {
        transcribeAudio(originalAudioBuffer, languageSelect.value, speakerIdCheckbox.checked);
      }
  });

  // Audio Studio
  pitchSlider.addEventListener('input', handlePitchChange);
  reverbSlider.addEventListener('input', handleReverbChange);
  bgMusicInput.addEventListener('change', handleBgMusicUpload);
  balanceSlider.addEventListener('input', handleBalanceChange);
  
  // Karaoke Studio
  bgImageInput.addEventListener('change', handleBgImageUpload);
  bgVideoInput.addEventListener('change', handleBgVideoUpload);
  createKaraokeBtn.addEventListener('click', createKaraokeVideo);
}

/**
 * Handles file selection from the input field.
 */
function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    processFile(file);
  }
}

/**
 * Handles file drag-and-drop.
 */
function handleDrop(event: DragEvent) {
  event.preventDefault();
  const file = event.dataTransfer?.files[0];
  if (file) {
    processFile(file);
  }
}

/**
 * Handles loading media from a URL.
 */
async function handleUrlLoad() {
    const url = urlInput.value.trim();
    if (!url) {
        urlError.textContent = 'Please enter a URL.';
        urlError.classList.remove('hidden');
        return;
    }

    urlError.classList.add('hidden');
    loadUrlBtn.disabled = true;
    loadUrlBtn.textContent = 'Loading...';

    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        
        if (!blob.type.startsWith('audio/') && !blob.type.startsWith('video/')) {
             throw new Error(`The URL does not point to a valid media file. Content-Type: ${blob.type || 'unknown'}`);
        }
        
        const fileName = new URL(url).pathname.split('/').pop() || 'media_from_url';
        const file = new File([blob], fileName, { type: blob.type });
        processFile(file);
    } catch (error: any) {
        const message = error.message.includes('403')
          ? "Failed to fetch. The content may be private or the source website is blocking requests."
          : error.message;
        urlError.textContent = `Error loading from URL: ${message}`;
        urlError.classList.remove('hidden');
    } finally {
        loadUrlBtn.disabled = false;
        loadUrlBtn.textContent = 'Load';
    }
}


/**
 * Processes the uploaded file, decodes audio, and starts transcription.
 */
async function processFile(file: File) {
  resetUI();
  originalFile = file;
  fileUploadText.textContent = file.name;
  uploader.classList.add('hidden');
  resultSection.classList.remove('hidden');
  
  const fileURL = URL.createObjectURL(file);
  audioPlayer.src = fileURL;

  if (file.type.startsWith('video/')) {
      originalVideoPlayer.src = fileURL;
      originalVideoBgOption.style.display = 'flex';
  } else {
      originalVideoBgOption.style.display = 'none';
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const tempAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    originalAudioBuffer = await tempAudioCtx.decodeAudioData(arrayBuffer);
    await tempAudioCtx.close();
    vocalRemoverSection.classList.remove('hidden');
    transcribeAudio(originalAudioBuffer, 'auto', false);
  } catch (error) {
    showError('Error decoding audio', `Could not process the audio from the provided file. It might be corrupted or in an unsupported format.`, error);
  }
}

/**
 * Transcribes audio using the Gemini API.
 */
async function transcribeAudio(buffer: AudioBuffer, language: string, identifySpeakers: boolean) {
  lyrics = [];
  displayLyrics(); // Clear previous lyrics
  loader.classList.remove('hidden');
  lyricsContainer.classList.add('hidden');
  downloadSection.classList.add('hidden');
  transcriptionSettings.classList.add('hidden');
  retranscribeBtn.disabled = true;

  try {
    const audioBlob = bufferToWave(buffer);
    const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
    });

    let prompt = `Transcribe the following audio and provide timestamps for each line in the format: [start_time_seconds - end_time_seconds] Text of the line. The timestamps must be accurate.`;
    if (language !== 'auto') {
        prompt += ` The audio is in ${language}.`;
    }
    if (identifySpeakers) {
        prompt += ` Identify different speakers and label each line like: [start_time - end_time] Speaker 1: Text.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { 
          parts: [
              { text: prompt },
              { inlineData: { mimeType: 'audio/wav', data: base64Audio } }
          ]
      }
    });
    
    lyrics = parseLyrics(response.text);
    displayLyrics();
    
    loader.classList.add('hidden');
    lyricsContainer.classList.remove('hidden');
    downloadSection.classList.remove('hidden');
    transcriptionSettings.classList.remove('hidden');

  } catch (error: any) {
      if (error.message && error.message.includes('RESOURCE_EXHAUSTED')) {
          showError(
              'API Quota Exceeded',
              `You have exceeded your free tier usage for the Gemini API. Please check your plan and billing details.`,
              error,
              'https://ai.google.dev/gemini-api/docs/rate-limits'
          );
      } else {
          showError('Error transcribing audio', 'An unexpected error occurred while contacting the AI model.', error);
      }
      loader.classList.add('hidden');
      lyricsContainer.classList.remove('hidden');
  } finally {
      retranscribeBtn.disabled = false;
  }
}

/**
 * Parses the raw text response from the API into a structured lyrics array.
 */
function parseLyrics(text: string): { startTime: number, endTime: number, text: string }[] {
  const lines = text.split('\n');
  const parsed = [];
  const regex = /\[\s*(\d*\.?\d+)\s*-\s*(\d*\.?\d+)\s*\]\s*(.*)/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      parsed.push({
        startTime: parseFloat(match[1]),
        endTime: parseFloat(match[2]),
        text: match[3].trim()
      });
    }
  }
  return parsed;
}

/**
 * Displays lyrics in the container and makes them editable.
 */
function displayLyrics() {
  lyricsContainer.innerHTML = '';
  if (lyrics.length === 0) {
      lyricsContainer.innerHTML = '<p class="hidden-until-transcribed">Transcription will appear here...</p>';
      return;
  }
  lyrics.forEach((line, index) => {
    const p = document.createElement('p');
    p.textContent = line.text;
    p.dataset.index = index.toString();
    p.contentEditable = "true";
    p.addEventListener('blur', (e) => {
        const target = e.target as HTMLParagraphElement;
        const editedIndex = parseInt(target.dataset.index || '0');
        if (lyrics[editedIndex]) {
            lyrics[editedIndex].text = target.textContent || '';
        }
    });
    lyricsContainer.appendChild(p);
  });
}

/**
 * Highlights the current lyric line based on audio player time.
 */
function syncLyrics() {
  const currentTime = audioPlayer.currentTime;
  const activeLineIndex = lyrics.findIndex(line => currentTime >= line.startTime && currentTime <= line.endTime);
  
  document.querySelectorAll('#lyrics-container p').forEach((p, index) => {
    if (index === activeLineIndex) {
      if (!p.classList.contains('active')) {
        p.classList.add('active');
        p.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      p.classList.remove('active');
    }
  });
}

/**
 * Removes vocals from the audio using phase inversion.
 */
async function removeVocals() {
    if (!originalAudioBuffer) return;

    removeVocalsBtn.disabled = true;
    removeVocalsBtn.textContent = 'Processing...';

    try {
        const offlineCtx = new OfflineAudioContext(
            originalAudioBuffer.numberOfChannels,
            originalAudioBuffer.length,
            originalAudioBuffer.sampleRate
        );
        
        const source = offlineCtx.createBufferSource();
        source.buffer = originalAudioBuffer;

        if (originalAudioBuffer.numberOfChannels >= 2) {
            // FIX: Corrected vocal removal logic.
            // The original code was attempting manual buffer manipulation but had several errors:
            // 1. It tried to get channel data from a ChannelSplitterNode instead of the AudioBuffer.
            // 2. It had unused AudioNode declarations.
            // 3. It incorrectly called start() on the original source for the stereo case.
            // This corrected code performs manual phase inversion on the buffer data directly.
            const leftChannel = originalAudioBuffer.getChannelData(0);
            const rightChannel = originalAudioBuffer.getChannelData(1);

            const mixedSignal = offlineCtx.createBuffer(1, originalAudioBuffer.length, originalAudioBuffer.sampleRate);
            const mixedData = mixedSignal.getChannelData(0);

            for (let i = 0; i < originalAudioBuffer.length; i++) {
                mixedData[i] = (leftChannel[i] - rightChannel[i]) / 2;
            }
            
            const monoSource = offlineCtx.createBufferSource();
            monoSource.buffer = mixedSignal;
            monoSource.connect(offlineCtx.destination);
            monoSource.start(0);

        } else {
            source.connect(offlineCtx.destination); // Pass mono through
            source.start(0);
        }

        instrumentalAudioBuffer = await offlineCtx.startRendering();
        
        playInstrumental();
        audioStudio.classList.remove('hidden');
        karaokeStudio.classList.remove('hidden');
        playOriginalBtn.classList.remove('hidden');
        
    } catch (error) {
        showError('Vocal Removal Failed', 'An error occurred while processing the audio.', error);
    } finally {
        removeVocalsBtn.textContent = '1. Remove Vocals';
        removeVocalsBtn.disabled = false;
    }
}

/**
 * Toggles playback between instrumental and original audio.
 */
function togglePlayback() {
    isInstrumental = !isInstrumental;
    playOriginalBtn.textContent = isInstrumental ? 'Play Original' : 'Play Instrumental';
    if (isInstrumental) {
        audioPlayer.pause();
        playInstrumental(audioPlayer.currentTime);
    } else {
        stopAudioContext();
        audioPlayer.play();
    }
}

/**
 * Plays the instrumental audio using Web Audio API for effects.
 */
function playInstrumental(startTime = 0) {
    if (!instrumentalAudioBuffer) return;
    if (isPlayingAudioContext) stopAudioContext();

    initializeAudioStudio();
    if (!audioContext || !instrumentalAudioSourceNode) return;

    instrumentalAudioSourceNode.buffer = instrumentalAudioBuffer;
    instrumentalAudioSourceNode.start(0, startTime);
    if(backgroundMusicSourceNode && backgroundMusicBuffer) {
        backgroundMusicSourceNode.buffer = backgroundMusicBuffer;
        backgroundMusicSourceNode.start(0, startTime);
    }
    
    isPlayingAudioContext = true;
    isInstrumental = true;
    audioPlayer.pause();
    // Sync the HTML audio player's time for lyric sync
    const syncInterval = setInterval(() => {
        if (isPlayingAudioContext) {
            audioPlayer.currentTime = startTime + audioContext!.currentTime;
        } else {
            clearInterval(syncInterval);
        }
    }, 100);
}

/**
 * Stops the Web Audio context playback.
 */
function stopAudioContext() {
    instrumentalAudioSourceNode?.stop();
    backgroundMusicSourceNode?.stop();
    instrumentalAudioSourceNode = null;
    backgroundMusicSourceNode = null;
    isPlayingAudioContext = false;
    isInstrumental = false;
}

/**
 * Sets up the Web Audio API graph for real-time playback.
 */
async function initializeAudioStudio() {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    instrumentalAudioSourceNode = audioContext.createBufferSource();
    backgroundMusicSourceNode = audioContext.createBufferSource();
    mainGainNode = audioContext.createGain();
    bgGainNode = audioContext.createGain();
    reverbNode = audioContext.createConvolver();
    
    const masterGain = audioContext.createGain();
    const dryGain = audioContext.createGain();
    const wetGain = audioContext.createGain();
    
    // Create graph
    instrumentalAudioSourceNode.connect(mainGainNode);
    backgroundMusicSourceNode.connect(bgGainNode);
    mainGainNode.connect(masterGain);
    bgGainNode.connect(masterGain);

    masterGain.connect(dryGain);
    masterGain.connect(reverbNode);
    reverbNode.connect(wetGain);
    dryGain.connect(audioContext.destination);
    wetGain.connect(audioContext.destination);

    // Set initial values from sliders
    instrumentalAudioSourceNode.playbackRate.value = Math.pow(2, parseFloat(pitchSlider.value) / 12);
    mainGainNode.gain.value = 1 - (parseFloat(balanceSlider.value) / 100);
    bgGainNode.gain.value = parseFloat(balanceSlider.value) / 100;
    
    const reverbAmount = parseFloat(reverbSlider.value) / 100;
    wetGain.gain.value = reverbAmount;
    dryGain.gain.value = 1 - reverbAmount;

    reverbNode.buffer = await createReverbImpulseResponse(audioContext);
}

// --- Audio Studio Handlers ---
function handlePitchChange(e: Event) {
    const pitch = parseFloat((e.target as HTMLInputElement).value);
    pitchValue.textContent = `${pitch > 0 ? '+' : ''}${pitch} semitones`;
    if (instrumentalAudioSourceNode) {
        instrumentalAudioSourceNode.playbackRate.value = Math.pow(2, pitch / 12);
    }
}

function handleReverbChange(e: Event) {
    const value = parseFloat((e.target as HTMLInputElement).value);
    reverbValue.textContent = `${value}%`;
    if (audioContext && reverbNode) {
        // This requires a wet/dry mix setup, simplified here
    }
}

async function handleBgMusicUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    backgroundMusicBuffer = await tempCtx.decodeAudioData(arrayBuffer);
    await tempCtx.close();
    balanceSlider.disabled = false;
    backgroundMusicPlayer.src = URL.createObjectURL(file);
}

function handleBalanceChange(e: Event) {
    const value = parseFloat((e.target as HTMLInputElement).value); // 0-100, where 0 is full main, 100 is full BG
    const mainVol = 1 - (value / 100);
    const bgVol = value / 100;
    balanceValue.textContent = `${Math.round(mainVol*100)}% Main / ${Math.round(bgVol*100)}% BG`;
    if (mainGainNode) mainGainNode.gain.value = mainVol;
    if (bgGainNode) bgGainNode.gain.value = bgVol;
}

// --- Karaoke Studio Handlers ---
function handleBgImageUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
        backgroundImage = new Image();
        backgroundImage.src = URL.createObjectURL(file);
    }
}

function handleBgVideoUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
        backgroundVideo = file;
        backgroundVideoPlayer.src = URL.createObjectURL(file);
    }
}

/**
 * Renders the karaoke video based on user settings.
 */
async function createKaraokeVideo() {
    if (!instrumentalAudioBuffer || lyrics.length === 0) {
        alert("Please generate lyrics and remove vocals first.");
        return;
    }

    createKaraokeBtn.disabled = true;
    renderingProgress.classList.remove('hidden');
    videoDownloadSection.classList.add('hidden');
    
    try {
        renderingStatus.textContent = 'Processing final audio...';
        renderingProgressBar.value = 5;

        const finalAudioBuffer = await getProcessedAudioBuffer();
        const audioTrack = new MediaStreamAudioSourceNode(new AudioContext(), { mediaStream: new MediaStream() }).mediaStream.getAudioTracks()[0]; // Hack to get a track
        const dest = new MediaStreamAudioDestinationNode(new AudioContext());
        const source = new AudioBufferSourceNode(new AudioContext(), { buffer: finalAudioBuffer });
        source.connect(dest);
        source.start(0);
        const finalAudioStream = dest.stream;

        renderingStatus.textContent = 'Setting up video renderer...';
        renderingProgressBar.value = 15;
        
        const [width, height] = resolutionSelect.value.split('x').map(Number);
        karaokeCanvas.width = width;
        karaokeCanvas.height = height;
        const ctx = karaokeCanvas.getContext('2d')!;
        const FPS = parseInt(fpsSelect.value);

        const stream = karaokeCanvas.captureStream(FPS);
        const combinedStream = new MediaStream([...stream.getVideoTracks(), ...finalAudioStream.getAudioTracks()]);
        const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            downloadVideoLink.href = url;
            videoDownloadSection.classList.remove('hidden');
            renderingProgress.classList.add('hidden');
        };

        recorder.start();
        
        renderingStatus.textContent = 'Rendering frames...';

        const duration = finalAudioBuffer.duration;
        let currentTime = 0;
        const frameDuration = 1 / FPS;

        const bgType = (document.querySelector('input[name="bg-type"]:checked') as HTMLInputElement).value;
        const font = fontSelect.value;
        const unsungColor = unsungColorInput.value;
        const sungColor = sungColorInput.value;

        if (bgType === 'video' && originalFile?.type.startsWith('video/')) {
            originalVideoPlayer.currentTime = 0;
            originalVideoPlayer.play();
        }
        if (bgType === 'bg-video' && backgroundVideo) {
            backgroundVideoPlayer.currentTime = 0;
            backgroundVideoPlayer.play();
        }

        function renderFrame() {
            if (currentTime > duration) {
                recorder.stop();
                originalVideoPlayer.pause();
                backgroundVideoPlayer.pause();
                return;
            }

            // Draw background
            ctx.clearRect(0, 0, width, height);
            switch (bgType) {
                case 'color':
                    ctx.fillStyle = bgColorInput.value;
                    ctx.fillRect(0, 0, width, height);
                    break;
                case 'image':
                    if (backgroundImage) ctx.drawImage(backgroundImage, 0, 0, width, height);
                    break;
                case 'video':
                    ctx.drawImage(originalVideoPlayer, 0, 0, width, height);
                    break;
                case 'bg-video':
                     ctx.drawImage(backgroundVideoPlayer, 0, 0, width, height);
                    break;
            }

            // Draw lyrics
            const activeLineIndex = lyrics.findIndex(line => currentTime >= line.startTime && currentTime < line.endTime);
            if (activeLineIndex !== -1) {
                const line = lyrics[activeLineIndex];
                const lineProgress = (currentTime - line.startTime) / (line.endTime - line.startTime);

                ctx.font = `${height * 0.08}px ${font}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.lineWidth = height * 0.01;
                ctx.strokeStyle = 'rgba(0,0,0,0.7)';

                const x = width / 2;
                const y = height * 0.85;
                const textMetrics = ctx.measureText(line.text);
                const textWidth = textMetrics.width;

                // Draw outline (unsung)
                ctx.strokeText(line.text, x, y);
                // Draw fill (unsung)
                ctx.fillStyle = unsungColor;
                ctx.fillText(line.text, x, y);
                
                // Draw sung part
                ctx.save();
                ctx.beginPath();
                ctx.rect(x - textWidth / 2, y - height * 0.1, textWidth * lineProgress, height * 0.2);
                ctx.clip();
                
                ctx.strokeText(line.text, x, y); // Sung outline
                ctx.fillStyle = sungColor;
                ctx.fillText(line.text, x, y); // Sung fill
                
                ctx.restore();
            }

            currentTime += frameDuration;
            renderingProgressBar.value = (currentTime / duration) * 100;
            requestAnimationFrame(renderFrame);
        }
        
        renderFrame();

    } catch (error) {
        showError('Video Creation Failed', 'An unexpected error occurred during rendering.', error);
        renderingProgress.classList.add('hidden');
    } finally {
        createKaraokeBtn.disabled = false;
    }
}

/**
 * Uses an OfflineAudioContext to apply all audio studio effects and return the final processed buffer.
 */
async function getProcessedAudioBuffer(): Promise<AudioBuffer> {
    if (!instrumentalAudioBuffer) throw new Error("Instrumental track not ready.");

    const offlineCtx = new OfflineAudioContext(
        instrumentalAudioBuffer.numberOfChannels,
        instrumentalAudioBuffer.length,
        instrumentalAudioBuffer.sampleRate
    );

    // Recreate the same graph as the real-time one
    const instrumentalSource = offlineCtx.createBufferSource();
    instrumentalSource.buffer = instrumentalAudioBuffer;
    
    const pitch = parseFloat(pitchSlider.value);
    instrumentalSource.playbackRate.value = Math.pow(2, pitch / 12);
    
    const mainGain = offlineCtx.createGain();
    const bgGain = offlineCtx.createGain();
    const balance = parseFloat(balanceSlider.value);
    mainGain.gain.value = 1 - (balance / 100);
    bgGain.gain.value = balance / 100;
    
    instrumentalSource.connect(mainGain);

    if (backgroundMusicBuffer) {
        const bgSource = offlineCtx.createBufferSource();
        bgSource.buffer = backgroundMusicBuffer;
        bgSource.connect(bgGain);
        bgSource.start(0);
    }

    const masterGain = offlineCtx.createGain();
    mainGain.connect(masterGain);
    bgGain.connect(masterGain);

    const reverb = offlineCtx.createConvolver();
    reverb.buffer = await createReverbImpulseResponse(offlineCtx);
    const wetGain = offlineCtx.createGain();
    const dryGain = offlineCtx.createGain();
    const reverbAmount = parseFloat(reverbSlider.value) / 100;
    wetGain.gain.value = reverbAmount;
    dryGain.gain.value = 1 - reverbAmount;

    masterGain.connect(dryGain);
    masterGain.connect(reverb);
    reverb.connect(wetGain);
    dryGain.connect(offlineCtx.destination);
    wetGain.connect(offlineCtx.destination);

    instrumentalSource.start(0);
    return await offlineCtx.startRendering();
}


// --- Utility and Helper Functions ---

function resetUI() {
    resultSection.classList.add('hidden');
    uploader.classList.remove('hidden');
    lyrics = [];
    lyricsContainer.innerHTML = '';
    downloadSection.classList.add('hidden');
    vocalRemoverSection.classList.add('hidden');
    audioStudio.classList.add('hidden');
    karaokeStudio.classList.add('hidden');
    transcriptionSettings.classList.add('hidden');
    videoDownloadSection.classList.add('hidden');
    playOriginalBtn.classList.add('hidden');
    fileUploadText.textContent = 'Drag & Drop an audio or video file or Click to Upload';
    originalFile = null;
    originalAudioBuffer = null;
    instrumentalAudioBuffer = null;
    backgroundMusicBuffer = null;
    backgroundImage = null;
    backgroundVideo = null;
    stopAudioContext();
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
}

function showError(title: string, message: string, error?: any, link?: string) {
    let details = error ? (error.stack || error.message || 'No further details available.') : '';
    lyricsContainer.innerHTML = `
        <div class="error-message">
            <p class="error-title">${title}</p>
            <p>${message}</p>
            ${link ? `<p>For more information, see: <a href="${link}" target="_blank" rel="noopener">Official Documentation</a></p>` : ''}
            ${details ? `<pre class="error-details">${details}</pre>` : ''}
        </div>
    `;
    lyricsContainer.classList.remove('hidden');
}

function downloadFile(content: string, fileName: string, contentType: string) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

function generateTxt(): string {
  return lyrics.map(line => line.text).join('\n');
}

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  const cs = Math.floor((seconds - (min * 60 + sec)) * 100);
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

function generateLrc(): string {
  return lyrics.map(line => `[${formatTime(line.startTime)}]${line.text}`).join('\n');
}

function generateSrt(): string {
  return lyrics.map((line, index) => {
    const start = formatTime(line.startTime).replace('.', ',');
    const end = formatTime(line.endTime).replace('.', ',');
    return `${index + 1}\n${start} --> ${end}\n${line.text}\n`;
  }).join('\n');
}

// https://github.com/mattdiamond/Recorderjs
function bufferToWave(abuffer: AudioBuffer): Blob {
    const numOfChan = abuffer.numberOfChannels;
    const length = abuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i = 0;
    let sample = 0;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // write interleaved data
    for (i = 0; i < abuffer.numberOfChannels; i++)
        channels.push(abuffer.getChannelData(i));

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }
    
    return new Blob([view], { type: 'audio/wav' });

    function setUint16(data: number) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: number) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}

/**
 * Generates a synthetic impulse response for the reverb effect.
 */
function createReverbImpulseResponse(audioCtx: BaseAudioContext): AudioBuffer {
    const sampleRate = audioCtx.sampleRate;
    const length = sampleRate * 2; // 2 seconds reverb
    const impulse = audioCtx.createBuffer(2, length, sampleRate);
    const impulseL = impulse.getChannelData(0);
    const impulseR = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
        impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
    }
    return impulse;
}


// --- Initialize App ---
init();
