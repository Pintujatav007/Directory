import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Brain, Check, ChevronRight, RotateCcw, Trophy, X } from 'lucide-react'

type Topic = 'DSA' | 'React' | 'Java' | 'JavaScript' | 'HTML' | 'CSS'
type Question = { question: string; options: string[]; answer: number; explanation: string }
const questionBank: Record<Topic, Question[]> = {
  DSA: [
    { question: 'What is the time complexity of binary search on a sorted array?', options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], answer: 1, explanation: 'Each comparison halves the remaining search range, so the number of steps grows logarithmically.' },
    { question: 'Which traversal finds the shortest path in an unweighted graph?', options: ['Depth-first search', 'Breadth-first search', 'In-order traversal', 'Binary search'], answer: 1, explanation: 'BFS visits vertices by distance layers, so the first visit to a vertex gives a shortest path in an unweighted graph.' },
    { question: 'What is the average lookup time for a key in a well-distributed hash table?', options: ['O(log n)', 'O(n)', 'O(1)', 'O(n log n)'], answer: 2, explanation: 'A hash table maps a key directly to a bucket on average. Heavy collisions can make lookup slower.' },
    { question: 'Which data structure is the most direct choice for checking matching brackets?', options: ['Queue', 'Stack', 'Heap', 'Graph'], answer: 1, explanation: 'A stack keeps the latest opening bracket at the top, so each closing bracket can be checked in constant time.' },
    { question: 'What is the worst-case time complexity of merge sort?', options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(n²)'], answer: 2, explanation: 'Merge sort splits the input into logarithmically many levels and merges all n items at each level.' },
  ],
  React: [
    { question: 'Why should list items have a stable key in React?', options: ['To encrypt the item', 'To help React match items between renders', 'To create CSS classes', 'To prevent state updates'], answer: 1, explanation: 'Keys help React identify which items were added, removed, or reordered, preserving the right component state.' },
    { question: 'When does an effect with an empty dependency array run after mount?', options: ['After every render', 'Once after the component mounts', 'Only when the page closes', 'Before the first render'], answer: 1, explanation: 'An empty dependency list means the effect has no reactive values to watch, so it runs after the initial mount (and cleans up on unmount).' },
    { question: 'What makes an input controlled in React?', options: ['It has a value driven by state and an onChange handler', 'It is inside a form', 'It has a placeholder', 'It is read-only'], answer: 0, explanation: 'A controlled input receives its displayed value from React state and updates that state from its change handler.' },
    { question: 'What does useMemo primarily help with?', options: ['Persisting data after refresh', 'Memoizing a calculated value between renders', 'Replacing all state', 'Making network requests'], answer: 1, explanation: 'useMemo can skip recalculating a value until its dependencies change. Use it when the calculation cost justifies it.' },
    { question: 'How should you update state when the next value depends on the previous value?', options: ['Mutate the current state object', 'Use a functional state update', 'Change a DOM node directly', 'Call setState only on unmount'], answer: 1, explanation: 'A functional update such as setCount(current => current + 1) uses the latest queued state value.' },
  ],
  Java: [
    { question: 'Which statement about Java String objects is correct?', options: ['Strings are mutable by default', 'Strings are immutable', 'Strings cannot be compared', 'Strings are primitive values'], answer: 1, explanation: 'String values are immutable; operations that appear to change a string create a new String object.' },
    { question: 'Which collection maps keys to values and allows one null key in HashMap?', options: ['HashMap', 'TreeSet', 'ArrayDeque', 'PriorityQueue'], answer: 0, explanation: 'HashMap allows one null key and multiple null values. Other Map implementations may have different rules.' },
    { question: 'What is method overriding?', options: ['Defining same-named methods with different parameters in one class', 'A subclass providing its own implementation of an inherited method', 'Calling a private method from another package', 'Changing a variable type at runtime'], answer: 1, explanation: 'Overriding lets a subclass specialize an inherited instance method; the selected implementation is resolved at runtime.' },
    { question: 'When must a checked exception generally be handled or declared?', options: ['Only in constructors', 'At compile time', 'Only when the program exits', 'Never'], answer: 1, explanation: 'Java requires checked exceptions to be caught or declared with throws, unless they are handled by an enclosing method.' },
    { question: 'Which access level allows a member to be used throughout its package?', options: ['private', 'protected only', 'package-private (no modifier)', 'public only'], answer: 2, explanation: 'With no access modifier, a member has package-private access and can be used by classes in the same package.' },
  ],
  JavaScript: [
    { question: 'What is the main scope difference between let and var?', options: ['let is block-scoped; var is function-scoped', 'let is global-only; var is block-scoped', 'There is no difference', 'var cannot be reassigned'], answer: 0, explanation: 'let is scoped to its nearest block; var is scoped to its nearest function (or global scope).' },
    { question: 'What does === check in JavaScript?', options: ['Value after type conversion', 'Strict equality without type coercion', 'Whether two objects have the same properties', 'Whether a value is truthy'], answer: 1, explanation: 'Strict equality compares values without coercing their types first.' },
    { question: 'Which callback normally runs first after the current call stack: a resolved Promise handler or setTimeout(..., 0)?', options: ['setTimeout callback', 'Promise handler', 'They run at the same time', 'Neither callback runs'], answer: 1, explanation: 'Promise reactions are queued as microtasks, which are processed before the next timer task.' },
    { question: 'What does an arrow function inherit for this?', options: ['Its own this based on how it is called', 'The surrounding lexical this', 'The global this in all modules', 'The this value from its return value'], answer: 1, explanation: 'Arrow functions do not create their own this binding; they capture it from the surrounding scope.' },
    { question: 'What does Array.prototype.map return?', options: ['The original array, mutated', 'A new array of mapped values', 'A single accumulated value', 'A boolean'], answer: 1, explanation: 'map returns a new array containing the callback result for each element; it does not mutate the source array itself.' },
  ],
  HTML: [
    { question: 'Which element is most appropriate for an action that submits a form?', options: ['<div>', '<button type="submit">', '<span>', '<section>'], answer: 1, explanation: 'A button with type="submit" has the correct native behavior and is keyboard accessible.' },
    { question: 'What should useful alt text on an informative image provide?', options: ['The image file name', 'A concise text equivalent of the image’s relevant information', 'A full copyright notice', 'The image dimensions'], answer: 1, explanation: 'Alt text communicates the image meaning or function to people who cannot see it. Decorative images can use empty alt text.' },
    { question: 'How do you programmatically associate a label with an input?', options: ['Set label name equal to input class', 'Match label for to input id', 'Wrap both in a paragraph', 'Give both the same placeholder'], answer: 1, explanation: 'The label’s for attribute should match the input id, which also makes the label clickable.' },
    { question: 'What does the defer attribute do on a classic external script?', options: ['Runs the script before HTML parsing', 'Downloads in parallel and runs after parsing, in document order', 'Runs only when clicked', 'Blocks the browser from downloading CSS'], answer: 1, explanation: 'A deferred classic script executes after HTML parsing and preserves order relative to other deferred scripts.' },
    { question: 'Which element represents the main content of a document?', options: ['<main>', '<aside>', '<footer>', '<label>'], answer: 0, explanation: 'The main element identifies the dominant content unique to that document.' },
  ],
  CSS: [
    { question: 'With the default content-box model, what does width: 200px set?', options: ['Content width only', 'Content plus padding and border', 'The margin box', 'The viewport width'], answer: 0, explanation: 'In content-box, width applies to content; padding and border are added outside it. border-box includes them.' },
    { question: 'Which layout tool is designed for two-dimensional rows and columns?', options: ['Flexbox', 'CSS Grid', 'Float', 'Inline formatting'], answer: 1, explanation: 'Grid is designed for two-dimensional layouts. Flexbox is primarily one-dimensional along a row or column.' },
    { question: 'Which selector has the highest specificity?', options: ['.card', 'main article', '#profile', '*'], answer: 2, explanation: 'An ID selector has greater specificity than a class selector, type selector, or universal selector.' },
    { question: 'What is the purpose of a media query?', options: ['Load JavaScript modules', 'Apply styles when a condition such as viewport width matches', 'Create a database query', 'Make an element semantic'], answer: 1, explanation: 'Media queries adapt styles to viewport or device conditions, commonly for responsive layouts.' },
    { question: 'In a flex container, what does justify-content control by default?', options: ['Alignment on the cross axis', 'Distribution along the main axis', 'Font weight', 'Element stacking order'], answer: 1, explanation: 'justify-content distributes items along the flex main axis; align-items controls the cross axis.' },
  ],
}
const topics = Object.keys(questionBank) as Topic[]

export function PracticePage({ accountId }: { accountId: string | null }) {
  const [topic, setTopic] = useState<Topic>('DSA')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const questions = useMemo(() => questionBank[topic], [topic])
  const finished = questionIndex >= questions.length
  const question = questions[questionIndex]
  const storageKey = `dd-interview-best-${accountId ?? 'guest'}-${topic}`

  useEffect(() => {
    try { setBest(Number(localStorage.getItem(storageKey) ?? 0)) } catch { setBest(0) }
  }, [storageKey])
  useEffect(() => {
    if (!finished) return
    const nextBest = Math.max(best, score)
    setBest(nextBest)
    try { localStorage.setItem(storageKey, String(nextBest)) } catch { /* Quiz scores still work if storage is unavailable. */ }
  }, [finished, score, best, storageKey])

  const chooseTopic = (next: Topic) => { setTopic(next); setQuestionIndex(0); setSelected(null); setScore(0) }
  const answer = (optionIndex: number) => {
    if (selected !== null) return
    setSelected(optionIndex)
    if (optionIndex === question.answer) setScore((current) => current + 1)
  }
  const nextQuestion = () => { setQuestionIndex((current) => current + 1); setSelected(null) }
  const restart = () => { setQuestionIndex(0); setSelected(null); setScore(0) }

  return <section className="practice-page container">
    <div className="practice-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> INTERVIEW PRACTICE</div><h1>Prepare with<br/><span>purpose.</span></h1><p>Practice common screening topics, check your reasoning, and build confidence before the interview.</p></div><div className="practice-best"><Trophy size={21}/><span>PERSONAL BEST<strong>{best} / {questions.length}</strong></span></div></div>
    <div className="practice-topics" role="tablist" aria-label="Choose an interview topic">{topics.map((item) => <button key={item} role="tab" aria-selected={topic === item} className={topic === item ? 'practice-topic active' : 'practice-topic'} onClick={() => chooseTopic(item)}><span>{item}</span><small>{questionBank[item].length} questions</small></button>)}</div>
    <div className="practice-layout"><aside className="practice-guide"><div className="practice-guide-icon"><Brain size={21}/></div><span className="practice-kicker">JOB SCREENING PREP</span><h2>{topic} fundamentals</h2><p>Pick an answer to see why it works. Finish the set to see your score, then try another topic.</p><div className="practice-stat"><span>QUESTION SET</span><strong>{questions.length} questions</strong></div><div className="practice-stat"><span>YOUR SCORE</span><strong>{score} correct so far</strong></div><button className="button button-outline" onClick={restart}><RotateCcw size={14}/> Restart set</button></aside>
      <main className="practice-quiz">{finished ? <div className="practice-result"><span className="practice-result-icon"><Trophy size={25}/></span><span className="practice-kicker">SET COMPLETE</span><h2>{score === questions.length ? 'Excellent work.' : score >= 3 ? 'Good progress.' : 'Keep practicing.'}</h2><p>You answered <strong>{score} of {questions.length}</strong> {topic} questions correctly.</p><div className="practice-result-bar"><span style={{ width: `${Math.round(score / questions.length * 100)}%` }}/></div><div className="practice-result-actions"><button className="button button-light" onClick={restart}><RotateCcw size={14}/> Try again</button><button className="button button-outline" onClick={() => chooseTopic(topics[(topics.indexOf(topic) + 1) % topics.length])}>Next topic <ArrowRight size={14}/></button></div></div> : <><div className="practice-question-meta"><span>{topic.toUpperCase()}</span><span>QUESTION {questionIndex + 1} / {questions.length}</span></div><div className="practice-question-progress"><span style={{ width: `${(questionIndex + (selected !== null ? 1 : 0)) / questions.length * 100}%` }}/></div><h2>{question.question}</h2><div className="practice-options">{question.options.map((option, index) => { const isSelected = selected === index; const isCorrect = selected !== null && index === question.answer; const isWrong = isSelected && index !== question.answer; return <button key={option} className={`practice-option${isCorrect ? ' correct' : ''}${isWrong ? ' incorrect' : ''}`} onClick={() => answer(index)} disabled={selected !== null}><span className="practice-option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{isCorrect && <Check size={17} />}{isWrong && <X size={17}/>}</button> })}</div>{selected !== null && <div className={`practice-explanation ${selected === question.answer ? 'right' : 'wrong'}`}><strong>{selected === question.answer ? 'That’s right.' : 'Not quite.'}</strong><p>{question.explanation}</p></div>}<div className="practice-footer"><span>{selected === null ? 'Choose the best answer to continue.' : `${score} correct so far`}</span>{selected !== null && <button className="button button-light" onClick={nextQuestion}>{questionIndex === questions.length - 1 ? 'See results' : 'Next question'} <ChevronRight size={15}/></button>}</div></>}</main>
    </div><p className="practice-note">Practice questions are original study prompts, not guaranteed interview questions from any employer.</p>
  </section>
}
