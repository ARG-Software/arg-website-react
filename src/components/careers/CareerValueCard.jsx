export function CareerValueCard({ number, title, description, antiValue, animateOrder }) {
  return (
    <article className="cp-value-card" data-animate="fade-up" data-animate-order={animateOrder}>
      <span className="cp-value-number">{number}</span>
      <h3 className="cp-value-title">{title}</h3>
      <p className="cp-value-desc">{description}</p>
      <div className="cp-value-anti">
        <strong>NOT</strong> {antiValue}
      </div>
    </article>
  );
}
