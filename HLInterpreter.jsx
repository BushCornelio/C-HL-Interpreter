// HLInt - HL Language Interpreter
// Author: Bush Cornelio
// Course: CSS125L

import React, { useState } from 'react';
import { Play, FileText, AlertCircle, CheckCircle } from 'lucide-react';

const HLInterpreter = () => {
  // State variables for storing outputs
  const [sourceCode, setSourceCode] = useState('x:integer;\nx:=5;\noutput<<x;');
  const [noSpaces, setNoSpaces] = useState('');
  const [resSyms, setResSyms] = useState('');
  const [output, setOutput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasError, setHasError] = useState(false);

  // Reserved words and symbols in HL language
  const reservedWords = ['integer', 'double', 'output', 'if'];
  const symbols = [':', ';', '=', '+', '-', '<', '>', '!', '(', ')', '<<', ':=', '==', '!='];

  /**
   * Removes all whitespace from source code
   * Output: NOSPACES.TXT content
   */
  const removeSpaces = (code) => {
    return code.replace(/\s+/g, '');
  };

  /**
   * Extracts reserved words and symbols from source code
   * Output: RES_SYM.TXT content
   */
  const extractReservedAndSymbols = (code) => {
    const found = [];
    const codeNoSpaces = removeSpaces(code);
    
    // Check for reserved words
    reservedWords.forEach(word => {
      if (codeNoSpaces.toLowerCase().includes(word)) {
        found.push(word);
      }
    });

    // Check for symbols (check longer symbols first to avoid substring matches)
    const sortedSymbols = [...symbols].sort((a, b) => b.length - a.length);
    sortedSymbols.forEach(symbol => {
      if (codeNoSpaces.includes(symbol)) {
        const count = (codeNoSpaces.match(new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        for (let i = 0; i < count; i++) {
          found.push(symbol);
        }
      }
    });

    return found.join(', ');
  };

  /**
   * Validates syntax of HL source code
   * Returns: null if no errors, error message string if errors found
   */
  const validateSyntax = (code) => {
    const lines = code.trim().split('\n').filter(line => line.trim());
    const variables = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Variable declaration: x:integer; or y:double;
      if (line.match(/^\w+:(integer|double);$/)) {
        const varName = line.split(':')[0];
        const varType = line.split(':')[1].replace(';', '');
        variables[varName] = varType;
        continue;
      }

      // Assignment: x:=5; or y:=2.35;
      if (line.match(/^\w+:=[\d.]+;$/)) {
        const varName = line.split(':=')[0];
        if (!variables[varName]) {
          return `Error on line ${i + 1}: Variable '${varName}' not declared`;
        }
        continue;
      }

      // Output statement: output<<x; or output<<"hello";
      if (line.match(/^output<<.+;$/)) {
        continue;
      }

      // If statement: if(condition)
      if (line.match(/^if\(.+[<>!=]=?.+\)$/i)) {
        continue;
      }

      // Expression: x=3+2;
      if (line.match(/^\w+=[^;]+;$/)) {
        continue;
      }

      return `Error on line ${i + 1}: Invalid syntax`;
    }

    return null;
  };

  /**
   * Executes the HL source code
   * Returns: Program output as string
   */
  const executeCode = (code) => {
    const lines = code.trim().split('\n').filter(line => line.trim());
    const variables = {};
    let programOutput = [];

    try {
      for (let line of lines) {
        line = line.trim();

        // Variable declaration
        if (line.match(/^\w+:(integer|double);$/)) {
          const varName = line.split(':')[0];
          const varType = line.split(':')[1].replace(';', '');
          variables[varName] = { type: varType, value: varType === 'integer' ? 0 : 0.0 };
          continue;
        }

        // Assignment statement
        if (line.match(/^\w+:=[\d.]+;$/)) {
          const varName = line.split(':=')[0];
          const value = parseFloat(line.split(':=')[1].replace(';', ''));
          if (variables[varName]) {
            variables[varName].value = value;
          }
          continue;
        }

        // Expression with mathematical operation
        if (line.match(/^\w+=[^;]+;$/)) {
          const varName = line.split('=')[0];
          const expression = line.split('=')[1].replace(';', '');
          
          // Handle addition
          if (expression.includes('+')) {
            const parts = expression.split('+');
            let result = 0;
            parts.forEach(part => {
              part = part.trim();
              if (variables[part]) {
                result += variables[part].value;
              } else {
                result += parseFloat(part);
              }
            });
            if (variables[varName]) {
              variables[varName].value = result;
            }
          } 
          // Handle subtraction
          else if (expression.includes('-')) {
            const parts = expression.split('-');
            let result = variables[parts[0]] ? variables[parts[0]].value : parseFloat(parts[0]);
            for (let i = 1; i < parts.length; i++) {
              const part = parts[i].trim();
              if (variables[part]) {
                result -= variables[part].value;
              } else {
                result -= parseFloat(part);
              }
            }
            if (variables[varName]) {
              variables[varName].value = result;
            }
          }
          continue;
        }

        // Output statement
        if (line.match(/^output<<.+;$/)) {
          const content = line.replace('output<<', '').replace(';', '');
          
          // String output (enclosed in quotes)
          if (content.startsWith('"') && content.endsWith('"')) {
            programOutput.push(content.slice(1, -1));
          } 
          // Variable output
          else if (variables[content]) {
            programOutput.push(variables[content].value.toString());
          }
          // Expression output (e.g., x+y)
          else if (content.includes('+') || content.includes('-')) {
            let result = 0;
            const operator = content.includes('+') ? '+' : '-';
            const parts = content.split(operator);
            
            if (operator === '+') {
              parts.forEach(part => {
                part = part.trim();
                if (variables[part]) {
                  result += variables[part].value;
                } else {
                  result += parseFloat(part);
                }
              });
            }
            programOutput.push(result.toString());
          }
          continue;
        }

        // If statement (one-way conditional)
        if (line.match(/^if\(.+\)$/i)) {
          const condition = line.match(/if\((.+)\)/i)[1];
          const nextLine = lines[lines.indexOf(line) + 1];
          
          // Parse and evaluate condition
          let conditionMet = false;
          if (condition.includes('<')) {
            const parts = condition.split('<');
            const left = variables[parts[0]] ? variables[parts[0]].value : parseFloat(parts[0]);
            const right = parseFloat(parts[1]);
            conditionMet = left < right;
          } else if (condition.includes('>')) {
            const parts = condition.split('>');
            const left = variables[parts[0]] ? variables[parts[0]].value : parseFloat(parts[0]);
            const right = parseFloat(parts[1]);
            conditionMet = left > right;
          } else if (condition.includes('==')) {
            const parts = condition.split('==');
            const left = variables[parts[0]] ? variables[parts[0]].value : parseFloat(parts[0]);
            const right = parseFloat(parts[1]);
            conditionMet = left === right;
          } else if (condition.includes('!=')) {
            const parts = condition.split('!=');
            const left = variables[parts[0]] ? variables[parts[0]].value : parseFloat(parts[0]);
            const right = parseFloat(parts[1]);
            conditionMet = left !== right;
          }

          // Execute next statement if condition is true
          if (conditionMet && nextLine && nextLine.trim().match(/^output<<.+;$/)) {
            const content = nextLine.trim().replace('output<<', '').replace(';', '');
            if (variables[content]) {
              programOutput.push(variables[content].value.toString());
            }
          }
        }
      }

      return programOutput.join('\n');
    } catch (e) {
      return 'Runtime Error: ' + e.message;
    }
  };

  /**
   * Main interpreter function
   * Performs all three steps: remove spaces, extract symbols, validate syntax
   */
  const runInterpreter = () => {
    // Step 1: Remove spaces and generate NOSPACES.TXT
    const noSpacesContent = removeSpaces(sourceCode);
    setNoSpaces(noSpacesContent);

    // Step 2: Extract reserved words and symbols for RES_SYM.TXT
    const resSymsContent = extractReservedAndSymbols(sourceCode);
    setResSyms(resSymsContent);

    // Step 3: Validate syntax
    const syntaxError = validateSyntax(sourceCode);
    
    if (syntaxError) {
      // Syntax error found
      setHasError(true);
      setErrorMessage('ERROR: ' + syntaxError);
      setOutput('');
    } else {
      // No syntax errors
      setHasError(false);
      setErrorMessage('NO ERROR(S) FOUND');
      
      // Step 4: Execute the program
      const result = executeCode(sourceCode);
      setOutput(result);
    }
  };

  /**
   * Load sample programs
   */
  const loadSample = (sampleNum) => {
    const samples = {
      1: 'x:integer;\nx:=5;\noutput<<x;',
      2: 'x:integer;\ny:double;\nx:=3;\ny:=1.25;\noutput<<x+y;',
      3: 'x:integer;\ny:double;\nx:=3;\nif(x<5)\noutput<<x;'
    };
    setSourceCode(samples[sampleNum]);
  };

  // UI Component (React JSX)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-indigo-900 mb-2">HL Language Interpreter</h1>
          <p className="text-gray-600 mb-4">A Simple Interpreter for Hypothetical Language (HL)</p>
          
          <div className="flex gap-2 mb-4">
            <button onClick={() => loadSample(1)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Load PROG1.HL
            </button>
            <button onClick={() => loadSample(2)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Load PROG2.HL
            </button>
            <button onClick={() => loadSample(3)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Load PROG3.HL
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Source Code</label>
              <textarea
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
                className="w-full h-64 p-4 border-2 border-gray-300 rounded-lg font-mono text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Enter HL source code..."
              />
              <button
                onClick={runInterpreter}
                className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 font-semibold"
              >
                <Play size={20} />
                Run Interpreter
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FileText size={16} />
                  NOSPACES.TXT
                </label>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 h-32 overflow-auto font-mono text-xs break-all">
                  {noSpaces || 'No output yet'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FileText size={16} />
                  RES_SYM.TXT
                </label>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 h-32 overflow-auto font-mono text-xs">
                  {resSyms || 'No output yet'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  {hasError ? <AlertCircle size={16} className="text-red-500" /> : <CheckCircle size={16} className="text-green-500" />}
                  Syntax Check
                </label>
                <div className={`p-4 rounded-lg border font-semibold ${
                  hasError ? 'bg-red-50 border-red-300 text-red-700' : 'bg-green-50 border-green-300 text-green-700'
                }`}>
                  {errorMessage || 'Run the interpreter to check syntax'}
                </div>
              </div>

              {output && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Program Output</label>
                  <div className="p-4 bg-gray-900 text-green-400 rounded-lg border border-gray-700 font-mono text-sm">
                    {output}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-indigo-900 mb-4">Language Specifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Data Types</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>integer</li>
                <li>double</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Operations</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Addition (+)</li>
                <li>Subtraction (-)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Conditional Operators</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Less than (&lt;)</li>
                <li>Greater than (&gt;)</li>
                <li>Equal (==)</li>
                <li>Not equal (!=)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Statements</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Variable declaration</li>
                <li>Assignment (:=)</li>
                <li>Output (&lt;&lt;)</li>
                <li>If statement</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HLInterpreter;