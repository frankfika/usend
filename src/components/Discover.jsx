// USend — the FAQ block below the tool, collapsed into a single row.

import { useLang } from "../i18n.jsx";

function DiscoveryContent() {
  const { t } = useLang();
  const faqs = [1, 2, 3, 4];
  return (
    <details className="faq-compact">
      <summary>{t("discover.faq.title")}</summary>
      <div className="faq-list">
        {faqs.map((n) => (
          <details key={n}>
            <summary>{t(`discover.faq${n}.q`)}</summary>
            <p>{t(`discover.faq${n}.a`)}</p>
          </details>
        ))}
      </div>
    </details>
  );
}

export { DiscoveryContent };
