import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';

import {
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils,
} from '@mediapipe/tasks-vision';

let lastVideoTime = -1;
let results: any = undefined;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  gestureRecognizer!: GestureRecognizer;

  webcamRunning: boolean = false;
  videoHeight = '360px';
  videoWidth = '480px';
  btnContent = 'Enable webcam';

  enableWebcamButton!: any;
  video!: any;
  canvasElement!: any;
  gestureOutput!: any;
  demosSection!: any;

  constructor(
    @Inject(DOCUMENT) public document: Document,
    public elRef: ElementRef
  ) {}

  ngOnInit() {
    this.fetchElements();

    this.createGestureRecognizer();

    // If webcam supported, add event listener to button for when user
    // wants to activate it.
    if (this.hasGetUserMedia()) {
      this.enableWebcamButton.addEventListener('click', () => {
        if (this.webcamRunning === true) {
          this.webcamRunning = false;
          this.btnContent = 'Enable predictions';
        } else {
          this.webcamRunning = true;
          this.btnContent = 'Disable predictions';
        }

        // getUsermedia parameters.
        const constraints = {
          video: true,
        };

        // Activate the webcam stream.
        navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
          this.video.srcObject = stream;
          this.video.addEventListener('loadeddata', (event: any) => {
            let nowInMs = Date.now();
            const canvasCtx = this.canvasElement.getContext('2d');

            if (this.video.currentTime !== lastVideoTime) {
              results = this.gestureRecognizer.recognizeForVideo(
                this.video,
                nowInMs
              );
              lastVideoTime = this.video.currentTime;
            }

            canvasCtx.save();
            canvasCtx.clearRect(
              0,
              0,
              this.canvasElement.width,
              this.canvasElement.height
            );
            const drawingUtils = new DrawingUtils(canvasCtx);

            this.canvasElement.style.height = this.videoHeight;
            this.video.style.height = this.videoHeight;
            this.canvasElement.style.width = this.videoWidth;
            this.video.style.width = this.videoWidth;

            if (results.landmarks) {
              for (const landmarks of results.landmarks) {
                drawingUtils.drawConnectors(
                  landmarks,
                  GestureRecognizer.HAND_CONNECTIONS,
                  {
                    color: '#00FF00',
                    lineWidth: 5,
                  }
                );
                drawingUtils.drawLandmarks(landmarks, {
                  color: '#FF0000',
                  lineWidth: 2,
                });
              }
            }

            canvasCtx.restore();

            if (results.gestures.length > 0) {
              this.gestureOutput.style.display = 'block';
              this.gestureOutput.style.width = this.videoWidth;
              const categoryName = results.gestures[0][0].categoryName;
              const categoryScore = results.gestures[0][0].score * 100;
              const handedness = results.handednesses[0][0].displayName;
              this.gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`;
            } else {
              this.gestureOutput.style.display = 'none';
            }

            requestAnimationFrame(() => {
                if (this.webcamRunning){
                    this.predictWebcam()
                }
            });
          });
        });
      });
    } else {
      console.warn('getUserMedia() is not supported by your browser');
    }
  }

  fetchElements() {
    this.enableWebcamButton =
      this.elRef.nativeElement.querySelector('#enableButton');
    this.video = this.elRef.nativeElement.querySelector('#webcam');
    this.demosSection = this.elRef.nativeElement.querySelector('#demo');
    this.canvasElement =
      this.elRef.nativeElement.querySelector('#outputCanvas');
    this.gestureOutput = this.elRef.nativeElement.querySelector('#output');
  }

  predictWebcam() {
    let nowInMs = Date.now();
    const canvasCtx = this.canvasElement.getContext('2d');

    if (this.video.currentTime !== lastVideoTime) {
      results = this.gestureRecognizer.recognizeForVideo(this.video, nowInMs);
      lastVideoTime = this.video.currentTime;
    }

    canvasCtx.save();
    canvasCtx.clearRect(
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height
    );
    const drawingUtils = new DrawingUtils(canvasCtx);

    this.canvasElement.style.height = this.videoHeight;
    this.video.style.height = this.videoHeight;
    this.canvasElement.style.width = this.videoWidth;
    this.video.style.width = this.videoWidth;

    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
        drawingUtils.drawConnectors(
          landmarks,
          GestureRecognizer.HAND_CONNECTIONS,
          {
            color: '#00FF00',
            lineWidth: 5,
          }
        );
        drawingUtils.drawLandmarks(landmarks, {
          color: '#FF0000',
          lineWidth: 2,
        });
      }
    }

    canvasCtx.restore();

    if (results.gestures.length > 0) {
      this.gestureOutput.style.display = 'block';
      this.gestureOutput.style.width = this.videoWidth;
      const categoryName = results.gestures[0][0].categoryName;
      const categoryScore = results.gestures[0][0].score * 100;
      const handedness = results.handednesses[0][0].displayName;
      this.gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`;
    } else {
      this.gestureOutput.style.display = 'none';
    }

    // Call this function again to keep predicting when the browser is ready.
    requestAnimationFrame(() => {
        if (this.webcamRunning){
            this.predictWebcam()
        }
    });
  }

  // Check if webcam access is supported.
  hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  async createGestureRecognizer() {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
    );
    this.gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      numHands: 2, // detect at max 2 hands
    });
    this.demosSection.classList.remove('invisible');
  }
}
