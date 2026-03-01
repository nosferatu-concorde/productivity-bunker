import Phaser from 'phaser';
import CRTPipeline from '../shaders/CRTPipeline.js';
import GlitchPipeline from '../shaders/GlitchPipeline.js';

export default class BaseScene extends Phaser.Scene {
  create() {
    this.cameras.main.setPostPipeline([GlitchPipeline, CRTPipeline]);
  }

  // Call from create() in any scene that should have muffled wind ambience.
  // Assumes 'wind' is already loaded (preload it in the scene if needed).
  _playMuffledWind(volume = 0.12) {
    const wind = this.sound.add('wind', { loop: true, volume });

    // Apply lowpass filter — makes it sound like wind heard through walls
    if (wind.gainNode && this.sound.context) {
      const ctx    = this.sound.context;
      const filter = ctx.createBiquadFilter();
      filter.type            = 'lowpass';
      filter.frequency.value = 350;
      filter.Q.value         = 0.5;
      wind.gainNode.disconnect();
      wind.gainNode.connect(filter);
      filter.connect(this.sound.masterVolumeNode);
    }

    const play = () => wind.play();
    if (this.sound.locked) {
      this.sound.once('unlocked', play);
    } else {
      play();
    }
    this.events.once('shutdown', () => wind.stop());
  }

  update(time) {
    const glitch = this.cameras.main.getPostPipeline(GlitchPipeline);
    if (glitch) glitch.updateGlitchState(time / 1000);
  }
}
