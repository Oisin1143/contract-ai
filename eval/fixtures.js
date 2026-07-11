// eval/fixtures.js
// Synthetic test contracts with deliberately planted, unambiguous issues.
// Ground truth is true by construction (the defect was written in on
// purpose), so scoring against these is objective: either the review
// caught it or it didn't. This exists because no real labelled contract
// dataset survives anywhere in this project (the original ML training
// corpus was lost — see api/predict.py) to eval against instead.

export const FIXTURES = [
  {
    id: "saas-liability-cap",
    description: "SaaS agreement — liability cap wildly disproportionate to contract value",
    mode: "presigning",
    // Each inner array is one distinct concept the review must hit — ANY
    // synonym within a group counts, but ALL groups must be hit for the
    // fixture to count as "caught". This tolerates paraphrasing (models
    // never use your exact wording) without accepting a coincidental
    // partial match as a genuine catch.
    expectedConcepts: [["liability"], ["cap", "capped", "£100", "100"]],
    contractText: `SOFTWARE AS A SERVICE AGREEMENT

This Agreement is made between Northgate Analytics Ltd ("Supplier") and Ferrow Logistics plc ("Customer").

1. SERVICES
Supplier shall provide the Customer with access to its cloud-based logistics optimisation platform ("the Service") for a term of 36 months.

2. FEES
Customer shall pay Supplier £480,000 per annum, payable quarterly in advance.

3. LIMITATION OF LIABILITY
The Supplier's total aggregate liability to the Customer under or in connection with this Agreement, whether arising in contract, tort (including negligence), or otherwise, shall not exceed £100 in total.

4. TERM AND TERMINATION
Either party may terminate this Agreement for material breach not remedied within 30 days of written notice.

5. GOVERNING LAW
This Agreement is governed by the laws of England and Wales.`,
  },
  {
    id: "nda-perpetual-confidentiality",
    description: "NDA — no time limit on confidentiality obligations",
    mode: "presigning",
    expectedConcepts: [["confidentiality"], ["duration", "term", "time limit", "indefinite", "perpetual", "no end"]],
    contractText: `MUTUAL NON-DISCLOSURE AGREEMENT

This Agreement is entered into between Halden Ventures Ltd and Marlow Bioscience Ltd for the purpose of evaluating a potential commercial partnership.

1. CONFIDENTIAL INFORMATION
Each party may disclose Confidential Information to the other in connection with the Purpose.

2. OBLIGATIONS
The receiving party shall keep all Confidential Information strictly confidential and shall not disclose it to any third party. The receiving party shall use the Confidential Information solely for the Purpose.

3. EXCLUSIONS
Confidential Information does not include information that is or becomes publicly available through no fault of the receiving party.

4. RETURN OF MATERIALS
Upon request, each party shall return or destroy all Confidential Information belonging to the other party.

5. GOVERNING LAW
This Agreement is governed by the laws of England and Wales.`,
  },
  {
    id: "employment-noncompete-overreach",
    description: "Employment contract — excessive non-compete (5 years, worldwide)",
    mode: "presigning",
    expectedConcepts: [
      ["restrictive covenant", "non-compete", "non-competition"],
      ["unreasonable", "excessive", "overly broad", "severely limit", "worldwide", "5 year"],
    ],
    contractText: `CONTRACT OF EMPLOYMENT

This Agreement is made between Trentbridge Consulting Ltd ("Employer") and the Employee.

1. POSITION
The Employee shall be employed as a Senior Business Analyst, reporting to the Head of Consulting.

2. SALARY
The Employee shall receive an annual salary of £52,000, paid monthly in arrears.

3. RESTRICTIVE COVENANTS
For a period of 5 years following termination of employment for any reason, the Employee shall not, anywhere in the world, engage or be interested in any business that competes with the Employer, nor solicit any client or prospective client of the Employer.

4. TERMINATION
Either party may terminate this Agreement by giving 4 weeks' written notice.

5. GOVERNING LAW
This Agreement is governed by the laws of England and Wales.`,
  },
  {
    id: "services-one-sided-termination",
    description: "Services agreement — only the supplier can terminate for convenience",
    mode: "presigning",
    expectedConcepts: [
      ["termination"],
      ["one-sided", "asymmetric", "imbalance", "unequal", "unilateral", "limited"],
    ],
    contractText: `CONSULTANCY SERVICES AGREEMENT

This Agreement is made between Ashworth Digital Ltd ("Supplier") and Corvin Retail Group Ltd ("Client").

1. SERVICES
Supplier shall provide digital transformation consultancy services as set out in Schedule 1.

2. FEES
Client shall pay Supplier's fees of £18,500 per month within 14 days of invoice.

3. TERM
This Agreement shall commence on the Effective Date and continue for an initial term of 24 months.

4. TERMINATION
The Supplier may terminate this Agreement at any time for convenience by giving 14 days' written notice to the Client. The Client may only terminate this Agreement for the Supplier's uncured material breach, subject to a 60-day cure period.

5. GOVERNING LAW
This Agreement is governed by the laws of England and Wales.`,
  },
  {
    id: "lease-autorenewal-trap",
    description: "Commercial lease — automatic renewal with no practical exit",
    mode: "presigning",
    expectedConcepts: [["renewal", "auto-renew"], ["notice", "window", "exit"]],
    contractText: `COMMERCIAL LEASE AGREEMENT

This Lease is made between Bellcourt Estates Ltd ("Landlord") and Quillfeather Design Studio Ltd ("Tenant") in respect of the premises at Unit 4, Meridian Business Park.

1. TERM
The initial term of this Lease shall be 3 years from the Commencement Date.

2. RENT
The Tenant shall pay rent of £42,000 per annum, payable monthly in advance.

3. RENEWAL
This Lease shall automatically renew for successive 3-year terms unless the Tenant gives written notice of termination not less than 18 months and not more than 20 months before the expiry of the then-current term. Failure to give notice within this window shall result in automatic renewal on the same terms.

4. REPAIRS
The Tenant shall keep the premises in good repair throughout the term.

5. GOVERNING LAW
This Lease is governed by the laws of England and Wales.`,
  },
  {
    id: "consultancy-ip-loophole",
    description: "Consultancy agreement — IP clause reads as assignment but never actually assigns",
    mode: "ma",
    expectedConcepts: [
      ["ip ownership", "intellectual property"],
      ["assign", "unclear", "not clearly defin", "does not assign", "fails to assign", "separately"],
    ],
    contractText: `CONSULTANCY AGREEMENT

This Agreement is made between Fenwick & Voss Design Ltd ("Consultant") and Harrowgate Media Ltd ("Client").

1. SERVICES
The Consultant shall design and develop a brand identity and associated digital assets for the Client (the "Deliverables").

2. FEES
The Client shall pay the Consultant a fixed fee of £34,000 upon completion of the Deliverables.

3. INTELLECTUAL PROPERTY
The Client acknowledges that the Consultant retains all right, title and interest in any pre-existing tools, templates, and methodologies used in creating the Deliverables. The parties agree that ownership of intellectual property rights in the Deliverables shall be discussed and agreed separately following completion of the Services.

4. WARRANTIES
The Consultant warrants that the Deliverables shall be free from material defects for a period of 90 days.

5. GOVERNING LAW
This Agreement is governed by the laws of England and Wales.`,
  },
  {
    id: "supply-uncapped-indemnity",
    description: "Supply agreement — uncapped, unqualified indemnity",
    mode: "presigning",
    expectedConcepts: [
      ["indemnity", "indemnif"],
      ["uncapped", "unlimited", "without limit", "no cap", "unqualified", "broad", "regardless of cause"],
    ],
    contractText: `SUPPLY OF GOODS AGREEMENT

This Agreement is made between Redmayne Components Ltd ("Supplier") and Oakhurst Manufacturing Ltd ("Buyer").

1. SUPPLY OF GOODS
The Supplier shall supply precision-machined components to the Buyer in accordance with the specifications set out in Schedule 1.

2. PRICE
The Buyer shall pay the prices set out in Schedule 2, payable within 30 days of invoice.

3. INDEMNITY
The Buyer shall indemnify and hold harmless the Supplier from and against any and all claims, losses, damages, liabilities, costs and expenses of any kind whatsoever arising out of or in connection with the Buyer's use of the goods, without limitation and regardless of cause.

4. DELIVERY
The Supplier shall use reasonable endeavours to deliver the goods within the timeframes specified in each purchase order.

5. GOVERNING LAW
This Agreement is governed by the laws of England and Wales.`,
  },
  {
    id: "jurisdiction-mismatch",
    description: "Governing law/jurisdiction unconnected to either UK party",
    mode: "presigning",
    expectedConcepts: [["jurisdiction", "governing law"], ["cayman", "unconnected", "unrelated", "no connection", "foreign"]],
    contractText: `DISTRIBUTION AGREEMENT

This Agreement is made between Thackeray Foods Ltd, a company registered in England, and Merrow & Pike Trading Ltd, a company registered in Scotland.

1. APPOINTMENT
The Supplier appoints the Distributor as its exclusive distributor of the Products within the United Kingdom.

2. FEES
The Distributor shall pay the Supplier's list prices less a 20% distributor discount.

3. TERM
This Agreement shall run for an initial term of 2 years from the Effective Date.

4. DISPUTE RESOLUTION
Any dispute arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the courts of the Cayman Islands, and this Agreement shall be governed by the laws of the Cayman Islands.

5. TERMINATION
Either party may terminate this Agreement on 90 days' written notice.`,
  },
];
