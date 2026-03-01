import Phaser from 'phaser';

export default class AudioScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AudioScene', active: true });
  }

  preload() {
    this.load.audio('humming_static', 'assets/sounds/humming-static.mp3');
  }

  create() {
    const music = this.sound.add('humming_static', { loop: true, volume: 0.15 });
    if (this.sound.locked) {
      this.sound.once('unlocked', () => music.play());
    } else {
      music.play();
    }
  }
}
