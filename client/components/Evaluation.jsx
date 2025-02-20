
function obtainParagraphs(evaluation) {
  if (evaluation == null) { return []; }
  const chunks = evaluation.trim().split(/---/)
  var largest = chunks[0].trim();
  for (var i = 0; i < chunks.length; ++i) {
    if (largest.length < chunks[i].trim().length) {
      largest = chunks[i].trim();
    }
  }
  return largest.split(/\n/);
}

export default function Evaluation({ evaluation }) {
  const paragraphs = obtainParagraphs(evaluation);
  
  const paragraphsToDisplay = [];
  for (var i = 0; i < paragraphs.length; ++i) {
    paragraphsToDisplay.push(
      <pre className="text-wrap" key={`pre_key_${i}`}>
        {paragraphs[i].trim() === '' ? '\u00A0' : p}
      </pre>
    );
  }
  
  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold mb-2">Evaluation</h2>
        {paragraphsToDisplay}
      </div>
    </section>
  );
}
