export class AnnElsVisibilityObserver {
  private observer: IntersectionObserver;

  private observedEls: HTMLElement[];

  constructor(isElVisibleCb: (el: HTMLElement) => void, isElNotVisibleCb: (el: HTMLElement) => void) {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          isElVisibleCb(el);
        } else {
          isElNotVisibleCb(el);
        }
      });
    }, {
      threshold: 0.1,
    });
    this.observedEls = [];
  }

  observe(el: HTMLElement): void {
    if (this.observedEls.includes(el)) return;
    this.observer.observe(el);
    this.observedEls.push(el);
  }

  unobserve(el: HTMLElement): void {
    this.observer.unobserve(el);
    this.observedEls = this.observedEls.filter(currEl => currEl !== el);
  }

  unobserveAllEls(): void {
    this.observedEls.forEach(el => this.unobserve(el));
    this.observedEls = [];
  }
}
