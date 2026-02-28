import Phaser from 'phaser';
import CRTPipeline from '../shaders/CRTPipeline.js';
import GlitchPipeline from '../shaders/GlitchPipeline.js';

export default class BaseScene extends Phaser.Scene {
  create() {
    this.cameras.main.setPostPipeline([GlitchPipeline, CRTPipeline]);
  }

  update(time) {
    const glitch = this.cameras.main.getPostPipeline(GlitchPipeline);
    if (glitch) glitch.updateGlitchState(time / 1000);
  }
}
