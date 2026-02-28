import Phaser from 'phaser';
import InterrogationScene from './scenes/InterrogationScene.js';
import StartScene from './scenes/StartScene.js';
import CRTPipeline from './shaders/CRTPipeline.js';
import GlitchPipeline from './shaders/GlitchPipeline.js';

const config = {
  type: Phaser.WEBGL,
  pipeline: { CRTPipeline, GlitchPipeline },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game',
    width: 800,
    height: 600,
  },
  scene: [StartScene, InterrogationScene],
};

new Phaser.Game(config);
