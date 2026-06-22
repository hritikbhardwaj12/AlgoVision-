let childWindow = null;
let lastSentCode = "";

function updateLeetCodeEditor(newCode) {
  // 1. Try Monaco Editor first if it's in the DOM
  if (document.querySelector('.monaco-editor') && window.monaco && window.monaco.editor) {
    const editors = window.monaco.editor.getEditors();
    if (editors && editors.length > 0) {
      if (editors[0].getValue() !== newCode) {
        editors[0].setValue(newCode);
      }
      return;
    }
  }

  // 2. Try CodeMirror 6 using layout height + keyword heuristics
  const cms = Array.from(document.querySelectorAll('.cm-content'))
    .map(el => {
      const rect = el.getBoundingClientRect();
      const text = el.cmView && el.cmView.view ? el.cmView.view.state.doc.toString() : "";
      let score = rect.height;
      if (text.includes('class ') || text.includes('Solution') || text.includes('public ') || text.includes('return') || text.includes('function') || text.includes('def ') || text.includes('import')) {
        score += 10000;
      }
      return { el, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (cms.length > 0) {
    const cmEl = cms[0].el;
    if (cmEl.cmView && cmEl.cmView.view) {
      const view = cmEl.cmView.view;
      if (view.state.doc.toString() !== newCode) {
        view.focus();
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: newCode },
          userEvent: "input.type",
          scrollIntoView: true
        });
        // Dispatch standard events to notify React hooks
        cmEl.dispatchEvent(new Event('input', { bubbles: true }));
        cmEl.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Trigger blur to force LeetCode's Redux state/autosave to persist the code
        setTimeout(() => {
          cmEl.dispatchEvent(new Event('blur', { bubbles: true }));
        }, 100);
      }
      return;
    }
  }

  // 3. Fallback: try Monaco editor anyway
  if (window.monaco && window.monaco.editor) {
    const editors = window.monaco.editor.getEditors();
    if (editors && editors.length > 0) {
      if (editors[0].getValue() !== newCode) {
        editors[0].setValue(newCode);
        const monacoEl = document.querySelector('.monaco-editor');
        if (monacoEl) {
          monacoEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      return;
    }
  }
}

function getLeetCodeCode() {
  // 1. Try Monaco Editor first if it's in the DOM
  if (document.querySelector('.monaco-editor') && window.monaco && window.monaco.editor) {
    const editors = window.monaco.editor.getEditors();
    if (editors && editors.length > 0) {
      return editors[0].getValue();
    }
  }

  // 2. Try CodeMirror 6 using layout height + keyword heuristics
  const cms = Array.from(document.querySelectorAll('.cm-content'))
    .map(el => {
      const rect = el.getBoundingClientRect();
      const text = el.cmView && el.cmView.view ? el.cmView.view.state.doc.toString() : "";
      let score = rect.height;
      if (text.includes('class ') || text.includes('Solution') || text.includes('public ') || text.includes('return') || text.includes('function') || text.includes('def ') || text.includes('import')) {
        score += 10000;
      }
      return { el, score, text };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (cms.length > 0) {
    const best = cms[0];
    if (best.el.cmView && best.el.cmView.view) {
      return best.text;
    }
  }

  // 3. Fallback: try Monaco editor anyway
  if (window.monaco && window.monaco.editor) {
    const editors = window.monaco.editor.getEditors();
    if (editors && editors.length > 0) {
      return editors[0].getValue();
    }
  }

  return "";
}

// Add the message listener globally
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'ALGOVISION_CODE_CHANGE') {
    lastSentCode = event.data.code; // Update instantly to prevent feedback sync-backs
    updateLeetCodeEditor(event.data.code);
  }
});

// Add code change check globally
setInterval(() => {
  if (childWindow && !childWindow.closed) {
    const currentCode = getLeetCodeCode();
    if (currentCode && currentCode !== lastSentCode) {
      lastSentCode = currentCode;
      childWindow.postMessage({ type: 'LEETCODE_CODE_CHANGE', code: currentCode }, '*');
    }
  }
}, 500);

function injectBridge() {
  const CURRENT_VERSION = "1.8";
  const existingBtn = document.getElementById('algovision-bridge-btn');
  
  if (existingBtn && existingBtn.getAttribute('data-version') === CURRENT_VERSION) {
    return;
  }

  if (existingBtn) {
    existingBtn.remove();
  }

  // Create an anchor <a> element styled as a button to natively bypass browser popup blockers
  const btn = document.createElement('a');
  btn.id = 'algovision-bridge-btn';
  btn.setAttribute('data-version', CURRENT_VERSION);
  btn.innerText = '🔮 Visualize Code';
  btn.target = '_blank';
  btn.href = 'http://localhost:5173/';
  
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '999999',
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    cursor: 'pointer',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    fontSize: '13px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    textDecoration: 'none',
    display: 'inline-block'
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateY(-2px) scale(1.03)';
    btn.style.boxShadow = '0 15px 30px -5px rgba(124, 58, 237, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
    updateLinkHref();
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translateY(0) scale(1)';
    btn.style.boxShadow = '0 10px 25px -5px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
  });

  btn.addEventListener('mousedown', () => {
    updateLinkHref();
  });

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    updateLinkHref();
    childWindow = window.open(btn.href, 'algovision_visualizer');
    if (childWindow) {
      try {
        childWindow.location.href = btn.href;
      } catch (err) {}
      childWindow.focus();
    }
    lastSentCode = getLeetCodeCode();
  });

  function updateLinkHref() {
    try {
      const isInsideTestcase = (el) => {
        return !!el.closest('[class*="testcase"], [class*="test-case"], [class*="console"], [id*="testcase"], [id*="test-case"], [id*="console"]');
      };

      // Whitelist main editor container elements
      const mainEditorSelector = '[data-track-load="code_editor"], .editor-container, .code-editor, [data-key="code-editor"]';
      const mainEditor = document.querySelector(mainEditorSelector);
      
      let codeText = "";
      try {
        codeText = getLeetCodeCode();
      } catch (e) {
        console.error("AlgoVision direct code scrape failed:", e);
      }

      // If direct scrape failed, try textareas as final fallback
      if (!codeText) {
        try {
          const textareas = Array.from(document.querySelectorAll('.monaco-editor textarea.inputarea, textarea.inputarea, textarea')).filter(el => !isInsideTestcase(el));
          const textarea = textareas[0];
          if (textarea && textarea.value && textarea.value.trim().length > 10) {
            codeText = textarea.value;
          }
        } catch (e) {}
      }

      if (!codeText) {
        btn.href = 'http://localhost:5173/';
        return;
      }

      // Normalize non-breaking spaces (\u00A0) to standard spaces to prevent compilation syntax errors
      codeText = codeText.replace(/\u00A0/g, ' ');

      // 2. Scrape Example Test cases
      const pageText = document.body.innerText;
      const examples = [];
      
      const exampleBlocks = pageText.split(/Example \d+:/gi);
      
      for (let i = 1; i < exampleBlocks.length; i++) {
        const block = exampleBlocks[i];
        
        // Find the "Input:" and "Output:" lines
        const inputMatch = block.match(/Input:\s*(.+)/i);
        const outputMatch = block.match(/Output:\s*([^\n]+)/i);
        
        if (inputMatch) {
          const variables = {};
          // Match standard structures: varName = [1,2,3], varName = 9, varName = "abc"
          const varRegex = /\b([a-zA-Z0-9_]+)\s*=\s*("[^"]*"|'[^']*'|\[[^\]]*\]|-?\d+(?:\.\d+)?|[a-zA-Z0-9_]+)/g;
          let match;
          while ((match = varRegex.exec(inputMatch[1])) !== null) {
            variables[match[1]] = match[2].trim();
          }
          
          examples.push({
            label: `Example ${i}`,
            variables,
            output: outputMatch ? outputMatch[1].trim() : ""
          });
        }
      }

      if (examples.length === 0) {
        // Fallback global search if structured Example blocks are missing
        const variables = {};
        const varRegex = /\b([a-zA-Z0-9_]+)\s*=\s*(\[[^\]]*\]|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*')/g;
        let match;
        let count = 0;
        while ((match = varRegex.exec(pageText)) !== null && count < 5) {
          variables[match[1]] = match[2].trim();
          count++;
        }
        
        examples.push({
          label: 'Example 1',
          variables,
          output: ""
        });
      }

      // Scrape Title
      let titleVal = "";
      try {
        const titleEl = document.querySelector('span.text-title-large, [data-cy="question-title"], h4, h3, h2, h1');
        if (titleEl && (titleEl.className.includes("title") || titleEl.getAttribute('data-cy') === 'question-title')) {
          titleVal = titleEl.textContent.trim();
        } else {
          // Fallback to page title
          titleVal = document.title;
          if (titleVal.endsWith(" - LeetCode")) {
            titleVal = titleVal.substring(0, titleVal.length - " - LeetCode".length);
          }
        }
      } catch (e) {}

      const queryParams = new URLSearchParams({
        code: codeText,
        examples: JSON.stringify(examples),
        title: titleVal
      });

      btn.href = `http://localhost:5173/?${queryParams.toString()}`;
    } catch (err) {
      alert("Scraping error: " + err.message);
    }
  }

  document.body.appendChild(btn);
}

setInterval(injectBridge, 2000);
injectBridge();
