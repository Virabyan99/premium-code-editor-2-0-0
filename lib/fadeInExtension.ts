import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";

// Fade-in effect definition (unchanged)
export const addFadeIn = StateEffect.define<{ from: number; to: number }>({
  map: ({ from, to }, change) => ({ from: change.mapPos(from), to: change.mapPos(to) }),
});

// Fade-in state field (unchanged)
export const fadeInField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(addFadeIn)) {
        const { from, to } = effect.value;
        const fadeInMark = Decoration.mark({
          attributes: { class: "cm-fade-in" },
        });
        decorations = decorations.update({
          add: [fadeInMark.range(from, to)],
        });
      }
    }
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

// Editor theme with effects (unchanged)
export const editorTheme = EditorView.theme({
  ".cm-fade-in": {
    animation: "fadeIn 0.4s ease-in-out",
  },
  "@keyframes fadeIn": {
    from: { opacity: "0" },
    to: { opacity: "1" },
  },
  ".cm-editor .cm-cursor": {
    animation: "pulse 0.5s ease-out",
  },
  "@keyframes pulse": {
    "0%": { opacity: "0.3", transform: "scale(1.5)" },
    "100%": { opacity: "1", transform: "scale(1)" },
  },
  ".cm-editor .cm-content": {
    textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
  },
});

// Cursor pulse plugin (updated)
export const pulseOnType = ViewPlugin.fromClass(
  class {
    view: EditorView;
    constructor(view: EditorView) {
      this.view = view;
    }
    update(update: ViewUpdate) {
      if (update.docChanged) {
        console.log("Pulse triggered");
        const cursors = this.view.dom.querySelectorAll(".cm-cursor");
        cursors.forEach((cursor) => {
          const htmlCursor = cursor as HTMLElement;
          htmlCursor.style.animation = "none";
          htmlCursor.offsetHeight; // Force reflow
          htmlCursor.style.animation = "pulse 0.5s ease-out";
        });
      }
    }
  }
);

// Export all extensions (unchanged)
export const fadeInExtension = [fadeInField, editorTheme, pulseOnType];