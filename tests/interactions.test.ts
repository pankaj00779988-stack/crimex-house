import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { JSDOM } from "jsdom";

test("free games, crew draft persistence, and native/copy sharing work through the controls", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://crimexhouse.vercel.app",
    pretendToBeVisual: true,
  });
  const globals = {
    window: dom.window,
    self: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    localStorage: dom.window.localStorage,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
    Node: dom.window.Node,
    Event: dom.window.Event,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const previous = new Map(
    Object.keys(globals).map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  const { render, fireEvent, cleanup, act } =
    await import("@testing-library/react/pure");
  const { MemoryGame, ReactionGame } = await import("../components/arcade");
  const { InvestigationBoard } = await import("../components/board");
  const { ShareButton } = await import("../components/share");
  try {
    const memory = render(createElement(MemoryGame));
    fireEvent.click(memory.getByRole("button", { name: "START DEAD DROP" }));
    const hidden = memory.getAllByRole("button", {
      name: /Evidence card \d+, face down/,
    });
    assert.equal(hidden.length, 12);
    fireEvent.click(hidden[0]);
    assert.equal(
      memory.getAllByRole("button", { name: /, revealed/ }).length,
      1,
    );
    fireEvent.click(
      memory.getByRole("button", { name: "RESHUFFLE & RESTART" }),
    );
    assert.equal(
      memory.getAllByRole("button", { name: /Evidence card \d+, face down/ })
        .length,
      12,
    );
    cleanup();

    const originalTimeout = dom.window.setTimeout.bind(dom.window);
    let signal: (() => void) | undefined;
    dom.window.setTimeout = ((
      handler: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ) => {
      if (
        typeof handler === "function" &&
        delay !== undefined &&
        delay >= 1400 &&
        delay <= 4000
      ) {
        signal = () => handler(...args);
        return 999999;
      }
      return originalTimeout(handler, delay, ...args);
    }) as typeof dom.window.setTimeout;
    const reaction = render(createElement(ReactionGame));
    fireEvent.click(reaction.getByRole("button", { name: /ARM THE RECEIVER/ }));
    fireEvent.click(reaction.getByRole("button", { name: /HOLD YOUR FIRE/ }));
    assert.ok(reaction.getByRole("button", { name: /TOO EARLY/ }));
    fireEvent.click(reaction.getByRole("button", { name: /TOO EARLY/ }));
    assert.ok(signal);
    act(() => signal!());
    fireEvent.click(reaction.getByRole("button", { name: /INTERCEPT!/ }));
    assert.ok(
      JSON.parse(localStorage.getItem("crimex:arcade:reaction-best:v1")!) >= 1,
    );
    cleanup();
    dom.window.setTimeout = originalTimeout;

    let board = render(createElement(InvestigationBoard));
    fireEvent.change(board.getByLabelText("YOUR INSTAGRAM HANDLE"), {
      target: { value: "@crew.one" },
    });
    fireEvent.change(board.getByLabelText(/YOUR CASE THEORY/), {
      target: { value: "Follow the evidence, then decide." },
    });
    fireEvent.click(
      board.getByRole("button", { name: "SAVE MY FREE CREW PIN" }),
    );
    const saved = JSON.parse(localStorage.getItem("crimex:crew:draft")!);
    assert.deepEqual(saved, {
      handle: "@crew.one",
      theory: "Follow the evidence, then decide.",
    });
    assert.ok(
      board.getByText(
        "Your free crew pin and theory are saved on this device.",
      ),
    );
    cleanup();
    board = render(createElement(InvestigationBoard));
    assert.ok(board.getByText("@crew.one"));
    assert.equal(
      (board.getByLabelText(/YOUR CASE THEORY/) as HTMLTextAreaElement).value,
      saved.theory,
    );
    cleanup();

    const copied: string[] = [];
    Object.defineProperty(dom.window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          copied.push(text);
        },
      },
    });
    let share = render(createElement(ShareButton));
    await act(async () => {
      fireEvent.click(
        share.getByRole("button", { name: "SHARE WITH THE CREW" }),
      );
    });
    assert.deepEqual(copied, ["https://crimexhouse.vercel.app"]);
    assert.ok(share.getByText("Website link copied. Send it to your crew."));
    cleanup();
    Object.defineProperty(dom.window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Denied");
        },
      },
    });
    share = render(createElement(ShareButton));
    await act(async () => {
      fireEvent.click(
        share.getByRole("button", { name: "SHARE WITH THE CREW" }),
      );
    });
    assert.equal(
      (share.getByLabelText("Website link to copy") as HTMLInputElement).value,
      "https://crimexhouse.vercel.app",
    );
    cleanup();
    let nativeCalls = 0;
    Object.defineProperty(dom.window.navigator, "share", {
      configurable: true,
      value: async () => {
        nativeCalls++;
        throw new dom.window.DOMException("Canceled", "AbortError");
      },
    });
    Object.defineProperty(dom.window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          copied.push(text);
        },
      },
    });
    share = render(createElement(ShareButton));
    await act(async () => {
      fireEvent.click(
        share.getByRole("button", { name: "SHARE WITH THE CREW" }),
      );
    });
    assert.equal(nativeCalls, 1);
    assert.equal(copied.length, 1);
  } finally {
    cleanup();
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
