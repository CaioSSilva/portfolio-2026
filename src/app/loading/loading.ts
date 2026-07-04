import { Component, effect, inject, ElementRef, viewChild, afterNextRender } from '@angular/core';
import gsap from 'gsap';
import { Resources } from '../three/services/resources';
import { ThreeApplication } from '../three/services/three-application';
import { BootSequence } from '../three/services/boot-sequence';

@Component({
  selector: 'app-loading',
  standalone: true,
  templateUrl: './loading.html',
  styleUrl: './loading.css',
})
export class Loading {
  private resources = inject(Resources);
  private threeApp = inject(ThreeApplication);
  public bootSequence = inject(BootSequence);

  private overlay = viewChild.required<ElementRef<HTMLDivElement>>('overlay');
  private bar = viewChild.required<ElementRef<HTMLDivElement>>('bar');
  private percentLabel = viewChild.required<ElementRef<HTMLSpanElement>>('percentLabel');
  private cubeSvg = viewChild.required<ElementRef<SVGSVGElement>>('cubeSvg');
  private topTrace = viewChild.required<ElementRef<SVGPathElement>>('topTrace');
  private leftTrace = viewChild.required<ElementRef<SVGPathElement>>('leftTrace');
  private rightTrace = viewChild.required<ElementRef<SVGPathElement>>('rightTrace');
  private terminalBody = viewChild.required<ElementRef<HTMLDivElement>>('terminalBody');

  private displayedProgress = { value: 0 };
  private traceLengths: number[] = [];
  private floatTween?: gsap.core.Tween;
  private previousLineCount = 0;

  constructor() {
    afterNextRender(() => {
      const traces = [this.topTrace(), this.leftTrace(), this.rightTrace()];
      this.traceLengths = traces.map((t) => t.nativeElement.getTotalLength());

      traces.forEach((t, i) => {
        gsap.set(t.nativeElement, {
          strokeDasharray: this.traceLengths[i],
          strokeDashoffset: this.traceLengths[i],
        });
      });

      this.floatTween = gsap.to(this.cubeSvg().nativeElement, {
        y: -6,
        duration: 1.8,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
    });

    effect(() => {
      const tasks = this.bootSequence.tasks();
      const doneCount = tasks.filter((t) => t.status === 'done').length;
      const runningTask = tasks.find((t) => t.status === 'running');
      const modelProgress = runningTask?.id === 'model' ? this.resources.progress() : 0;
      const target = (doneCount + modelProgress) / tasks.length;

      gsap.to(this.displayedProgress, {
        value: target,
        duration: 0.4,
        ease: 'power2.out',
        onUpdate: () => {
          const p = this.displayedProgress.value;
          gsap.set(this.bar().nativeElement, { scaleX: p });
          this.percentLabel().nativeElement.textContent = `${Math.round(p * 100)}%`;

          if (this.traceLengths.length === 3) {
            [this.topTrace(), this.leftTrace(), this.rightTrace()].forEach((t, i) => {
              gsap.set(t.nativeElement, {
                strokeDashoffset: this.traceLengths[i] * (1 - p),
              });
            });
          }
        },
      });

      queueMicrotask(() => {
        const lines = this.terminalBody().nativeElement.querySelectorAll('.terminal-line');
        const newLines = Array.from(lines).slice(this.previousLineCount);
        if (newLines.length) {
          gsap.from(newLines, {
            opacity: 0,
            x: -8,
            duration: 0.3,
            stagger: 0.05,
            ease: 'power1.out',
          });
        }
        this.previousLineCount = lines.length;
      });
    });

    effect(() => {
      if (this.threeApp.sceneReady()) {
        this.floatTween?.kill();

        const traces = [this.topTrace(), this.leftTrace(), this.rightTrace()].map((t) => t.nativeElement);

        gsap
          .timeline()
          .to(traces, { opacity: 0, duration: 0.5, ease: 'power2.in', stagger: 0.08 })
          .to(this.cubeSvg().nativeElement, { scale: 1.4, duration: 0.8, ease: 'power2.inOut' }, '<')
          .to('.terminal', { opacity: 0, y: 10, duration: 0.5, ease: 'power2.in' }, '<0.1')
          .to(this.overlay().nativeElement, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut' }, '-=0.3')
          .set(this.overlay().nativeElement, { display: 'none' });
      }
    });
  }
}