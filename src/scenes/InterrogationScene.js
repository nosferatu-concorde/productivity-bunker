import BaseScene from './BaseScene.js';

export default class InterrogationScene extends BaseScene {
  constructor() {
    super('InterrogationScene');
  }

  create() {
    super.create();

    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, 'interrogation', {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
