import BaseScene from './BaseScene.js';
import MistralAPI from '../systems/MistralAPI.js';

const FONT = { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', wordWrap: { width: 680 } };
const TYPEWRITER_MS = 30;

export default class InterrogationScene extends BaseScene {
  constructor() {
    super('InterrogationScene');
  }

  create() {
    super.create();

    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0, 0);

    this.label = this.add.text(60, height / 2, '[ OVERLORD TRANSMISSION... ]', {
      ...FONT,
      color: '#ffffff',
    }).setOrigin(0, 0.5);

    this.mistral = new MistralAPI();
    this.mistral
      .send('The worker has entered the interrogation chamber. Begin.')
      .then((msg) => this.typewrite(msg))
      .catch((err) => this.showError(err.message));
  }

  typewrite(text) {
    this.label.setColor('#ffffff').setText('');
    let i = 0;
    this.time.addEvent({
      delay: TYPEWRITER_MS,
      repeat: text.length - 1,
      callback: () => {
        this.label.setText(this.label.text + text[i++]);
      },
    });
  }

  showError(msg) {
    this.label.setColor('#ff2020').setText(`[ ERROR ]\n${msg}`);
  }
}
