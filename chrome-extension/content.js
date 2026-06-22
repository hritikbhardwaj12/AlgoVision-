function injectBridge() {
  if (document.getElementById('algovision-bridge-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'algovision-bridge-btn';
  btn.innerText = '🔮 Visualize Code';
  
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
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateY(-2px) scale(1.03)';
    btn.style.boxShadow = '0 15px 30px -5px rgba(124, 58, 237, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translateY(0) scale(1)';
    btn.style.boxShadow = '0 10px 25px -5px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
  });

  btn.addEventListener('click', () => {
    // 1. Scrape editor code
    const textarea = document.querySelector('.monaco-editor textarea.inputarea') || document.querySelector('textarea.inputarea');
    let codeText = "";
    
    if (textarea) {
      codeText = textarea.value;
    }
    
    if (!codeText) {
      const lineElements = Array.from(document.querySelectorAll('.view-lines .view-line'));
      if (lineElements.length > 0) {
        codeText = lineElements.map(el => el.textContent).join('\n');
      }
    }

    if (!codeText) {
      alert("Please focus/click inside your LeetCode code editor first!");
      return;
    }

    // 2. Scrape Example Test cases
    const pageText = document.body.innerText;
    const examples = [];
    
    const exampleBlocks = pageText.split(/Example \d+:/gi);
    
    for (let i = 1; i < exampleBlocks.length; i++) {
      const block = exampleBlocks[i];
      
      // Match Arrays: nums = [2,7,11,15]
      const numsMatch = block.match(/(?:nums|arr|array|grid)\s*=\s*(\[[^\]\n]+\])/i);
      
      // Match Strings: s = "abcabcbb"
      const stringMatch = block.match(/(?:s|str|string)\s*=\s*"([^"\n]+)"/i) || block.match(/(?:s|str|string)\s*=\s*'([^'\n]+)'/i);
      
      const targetMatch = block.match(/(?:target|k)\s*=\s*(-?\d+)/i) || block.match(/(?:target|k)\s*=\s*"([^"\n]+)"/i);
      
      if (numsMatch) {
        examples.push({
          label: `Example ${i}`,
          nums: numsMatch[1].replace(/\s/g, ''),
          target: targetMatch ? targetMatch[1] : '3'
        });
      } else if (stringMatch) {
        // Transform string characters into array format e.g. ["a","b","c"]
        const charArray = stringMatch[1].split('');
        examples.push({
          label: `Example ${i}`,
          nums: JSON.stringify(charArray),
          target: targetMatch ? targetMatch[1] : '0'
        });
      }
    }

    // Fallback
    if (examples.length === 0) {
      const numsMatch = pageText.match(/(?:nums|arr|array)\s*=\s*(\[[^\]]+\])/i);
      const targetMatch = pageText.match(/target\s*=\s*(-?\d+)/i);
      examples.push({
        label: 'Example 1',
        nums: numsMatch ? numsMatch[1].replace(/\s/g, '') : '[2,7,11,15]',
        target: targetMatch ? targetMatch[1] : '9'
      });
    }

    // 3. Redirect
    const queryParams = new URLSearchParams({
      code: codeText,
      examples: JSON.stringify(examples)
    });

    window.open(`http://localhost:5174/?${queryParams.toString()}`, 'algovision_tab');
  });

  document.body.appendChild(btn);
}

setInterval(injectBridge, 2000);
injectBridge();
