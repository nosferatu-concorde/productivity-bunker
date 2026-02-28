import Phaser from 'phaser';
import InterrogationScene from './scenes/InterrogationScene.js';
import StartScene from './scenes/StartScene.js';
import TodoScene from './scenes/TodoScene.js';
import ResultScene from './scenes/ResultScene.js';
import CRTPipeline from './shaders/CRTPipeline.js';
import GlitchPipeline from './shaders/GlitchPipeline.js';

const config = {
  type: Phaser.WEBGL,
  backgroundColor: '#ffffff',
  pipeline: { CRTPipeline, GlitchPipeline },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game',
    width: 800,
    height: 600,
  },
  scene: [ResultScene, StartScene, InterrogationScene, TodoScene], // DEBUG: ResultScene first
};

new Phaser.Game(config);
