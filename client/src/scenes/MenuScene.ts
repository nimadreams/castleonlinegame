import Phaser from "phaser";
import { getLanguage, setLanguage, t } from "../state/Localization";

export class MenuScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private singleText!: Phaser.GameObjects.Text;
  private multiText!: Phaser.GameObjects.Text;
  private langLabel!: Phaser.GameObjects.Text;
  private langFaText!: Phaser.GameObjects.Text;
  private langEnText!: Phaser.GameObjects.Text;
  private langFaBg!: Phaser.GameObjects.Rectangle;
  private langEnBg!: Phaser.GameObjects.Rectangle;

  constructor() {
    super("Menu");
  }

  create(): void {
    this.add.rectangle(640, 360, 1280, 720, 0x0b1120).setDepth(-1);

    this.titleText = this.add.text(640, 160, "", {
      color: "#f8fafc",
      fontSize: "42px",
      fontStyle: "bold",
      fontFamily: "Trebuchet MS"
    }).setOrigin(0.5, 0.5);

    const singleButton = this.add.rectangle(640, 300, 260, 64, 0x2563eb).setStrokeStyle(2, 0x1e40af);
    singleButton.setInteractive({ useHandCursor: true });
    this.singleText = this.add.text(640, 300, "", {
      color: "#f8fafc",
      fontSize: "20px",
      fontStyle: "bold",
      fontFamily: "Trebuchet MS"
    }).setOrigin(0.5, 0.5);

    const multiButton = this.add.rectangle(640, 380, 260, 64, 0x334155).setStrokeStyle(2, 0x0f172a);
    multiButton.setInteractive({ useHandCursor: true });
    this.multiText = this.add.text(640, 380, "", {
      color: "#e2e8f0",
      fontSize: "20px",
      fontStyle: "bold",
      fontFamily: "Trebuchet MS"
    }).setOrigin(0.5, 0.5);

    this.statusText = this.add.text(640, 460, "", {
      color: "#94a3b8",
      fontSize: "16px",
      fontFamily: "Trebuchet MS"
    }).setOrigin(0.5, 0.5);

    this.langLabel = this.add.text(640, 520, "", {
      color: "#e2e8f0",
      fontSize: "14px",
      fontFamily: "Trebuchet MS"
    }).setOrigin(0.5, 0.5);

    this.langFaBg = this.add.rectangle(590, 560, 110, 36, 0x1e293b).setStrokeStyle(1, 0x475569);
    this.langFaText = this.add.text(590, 560, "", {
      color: "#f8fafc",
      fontSize: "14px",
      fontStyle: "bold",
      fontFamily: "Trebuchet MS"
    }).setOrigin(0.5, 0.5);

    this.langEnBg = this.add.rectangle(690, 560, 110, 36, 0x1e293b).setStrokeStyle(1, 0x475569);
    this.langEnText = this.add.text(690, 560, "", {
      color: "#f8fafc",
      fontSize: "14px",
      fontStyle: "bold",
      fontFamily: "Trebuchet MS"
    }).setOrigin(0.5, 0.5);

    this.langFaBg.setInteractive({ useHandCursor: true });
    this.langEnBg.setInteractive({ useHandCursor: true });

    singleButton.on("pointerdown", () => {
      this.scene.start("Battle");
    });

    multiButton.on("pointerdown", () => {
      this.statusText.setText(t("menu.coming"));
    });

    this.langFaBg.on("pointerdown", () => {
      setLanguage("fa");
      this.refreshTexts();
    });

    this.langEnBg.on("pointerdown", () => {
      setLanguage("en");
      this.refreshTexts();
    });

    this.refreshTexts();
  }

  private refreshTexts(): void {
    const current = getLanguage();
    this.titleText.setText(t("menu.title"));
    this.singleText.setText(t("menu.single"));
    this.multiText.setText(t("menu.multi"));
    this.langLabel.setText(`${t("menu.language")}:`);
    this.langFaText.setText(t("menu.fa"));
    this.langEnText.setText(t("menu.en"));

    this.langFaBg.setFillStyle(current === "fa" ? 0x2563eb : 0x1e293b);
    this.langEnBg.setFillStyle(current === "en" ? 0x2563eb : 0x1e293b);
  }
}
