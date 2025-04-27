"use client";

import { useRef, useEffect } from "react";
import { EditorView, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { EditorState, Annotation } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { bracketMatching, indentUnit } from "@codemirror/language";
import { linter, lintGutter } from "@codemirror/lint";
import { keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { fadeInExtension, addFadeIn } from "@/lib/fadeInExtension";

// Define an annotation to mark external updates
const ExternalUpdate = Annotation.define<boolean>();

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Custom linter for // TODO: comments
  const todoLinter = linter((view) => {
    const diagnostics = [];
    const lines = view.state.doc.toString().split("\n");
    lines.forEach((line, index) => {
      if (line.includes("// TODO:")) {
        diagnostics.push({
          from: view.state.doc.line(index + 1).from,
          to: view.state.doc.line(index + 1).to,
          severity: "warning",
          message: "TODO comment found",
        });
      }
    });
    return diagnostics;
  });

  // Initialize the editor on mount
  useEffect(() => {
    if (editorRef.current && !viewRef.current) {
      const editorTheme = EditorView.theme({
        "&": {
          fontFamily: "var(--font-mono), monospace",
          fontFeatureSettings: '"liga" 1',
          spellCheck: "false",
          "-webkit-font-smoothing": "antialiased",
        },
      });

      const state = EditorState.create({
        doc: value,
        extensions: [
          editorTheme,
          lineNumbers(),
          highlightActiveLine(),
          javascript(),
          bracketMatching(),
          indentUnit.of("  "),
          lintGutter(),
          todoLinter,
          keymap.of(defaultKeymap),
          EditorView.lineWrapping,
          fadeInExtension,
          EditorView.updateListener.of((update) => {
            // Only call onChange for user-initiated changes (no ExternalUpdate annotation)
            if (
              update.docChanged &&
              !update.transactions.some((tr) => tr.annotation(ExternalUpdate))
            ) {
              onChange(update.state.doc.toString());
            }
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const changes = [];
              update.changes.iterChanges((fromA, toA, fromB, toB) => {
                if (fromB !== toB) {
                  changes.push({ from: fromB, to: toB });
                }
              });
              if (changes.length > 0) {
                update.view.dispatch({
                  effects: changes.map((change) => addFadeIn.of(change)),
                });
              }
            }
          }),
        ],
      });

      const view = new EditorView({
        state,
        parent: editorRef.current,
      });

      viewRef.current = view;
      // Focus the editor on mount to ensure key events are captured
      view.focus();

      return () => {
        view.destroy();
      };
    }
  }, [onChange]);

  // Sync editor content with value prop changes (e.g., loading a snippet)
  useEffect(() => {
    if (viewRef.current) {
      const currentCode = viewRef.current.state.doc.toString();
      if (currentCode !== value) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentCode.length, insert: value },
          annotations: ExternalUpdate.of(true), // Mark as external update
        });
      }
    }
  }, [value]);

  return <div ref={editorRef} className="h-[88vh]" />;
};

export default CodeEditor;