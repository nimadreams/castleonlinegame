export class OverlayUI {
  setStatus(text: string): void {
    const element = document.getElementById("status");
    if (element) {
      element.textContent = text;
    }
  }
}
