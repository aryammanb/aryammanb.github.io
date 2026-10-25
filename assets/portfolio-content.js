(() => {
  'use strict';
  const {API,render,enhanceEmails}=window.PortfolioContent;
  enhanceEmails(document.querySelector('main'));
  fetch(API+'/portfolio-content',{cache:'no-store',signal:AbortSignal.timeout(10000)})
    .then(response=>{if(!response.ok)throw new Error('Unavailable');return response.json();})
    .then(data=>render(data.document))
    .catch(()=>{}); // Original static content remains available during an outage.
})();
