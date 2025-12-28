import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-8">
          <div className="mb-6 pb-4 border-b border-gray-200 dark:border-dark-border">
            <Link to="/" className="inline-flex items-center text-primary-600 dark:text-dark-primary-500 hover:text-primary-700 dark:hover:text-dark-primary-400 transition">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Back to Home</span>
            </Link>
          </div>
          <div className="flex items-center justify-center mb-6">
            <Link to="/" className="inline-block">
              <img
                src="/TheraPTrackLogoBgRemoved.png"
                alt="TheraP Track Logo"
                className="h-12 w-12 object-contain hover:opacity-80 transition-opacity"
              />
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-dark-text-primary mb-6 text-center">Terms of Service</h1>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-8">Last Updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                Welcome to TheraP Track ("we," "our," or "us"). These Terms of Service ("Terms") constitute a legally binding agreement between you and TheraP Track governing your access to and use of our therapy tracking application and related services (collectively, the "Service").
              </p>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                By accessing, browsing, or using our Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and all applicable laws and regulations in India, including the Information Technology Act, 2000, and related rules and regulations.
              </p>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                If you do not agree with any part of these Terms, you must not use our Service. We reserve the right to modify these Terms at any time, and such modifications shall be effective immediately upon posting.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">2. Description of Service</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                TheraP Track is a web-based application designed to help users track their therapy progress through visual mind-body maps, session assessments, and progress analytics. Our Service facilitates communication and data management between users, therapists, and organizations.
              </p>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice. We do not guarantee that the Service will be available at all times or that it will be error-free.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">3. Eligibility and Registration</h2>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">3.1 Age Requirement</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                You must be at least 18 years of age to use our Service. By using the Service, you represent and warrant that you are of legal age to enter into a binding agreement and meet all eligibility requirements.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">3.2 Account Registration</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                To access certain features of the Service, you must register for an account. During registration, you agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-dark-text-secondary mb-4">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Accept responsibility for all activities that occur under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">3.3 Account Types</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                Our Service supports multiple account types (User, Therapist, Organization, Admin). Your access and permissions are determined by your account type. You agree to use only the account type that accurately represents your role and purpose.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">4. User Conduct and Responsibilities</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-dark-text-secondary mb-4">
                <li>Violate any applicable local, state, national, or international law or regulation</li>
                <li>Infringe upon the rights of others, including intellectual property rights</li>
                <li>Transmit any malicious code, viruses, or harmful software</li>
                <li>Attempt to gain unauthorized access to the Service or related systems</li>
                <li>Interfere with or disrupt the Service or servers connected to the Service</li>
                <li>Use automated systems (bots, scrapers) to access the Service without permission</li>
                <li>Impersonate any person or entity or misrepresent your affiliation</li>
                <li>Harass, abuse, threaten, or harm other users</li>
                <li>Upload or transmit any content that is defamatory, obscene, or offensive</li>
                <li>Collect or store personal information about other users without their consent</li>
                <li>Use the Service for any commercial purpose without our prior written consent</li>
              </ul>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                Violation of these terms may result in immediate termination of your account and legal action.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">5. Content and Intellectual Property</h2>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">5.1 Your Content</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                You retain ownership of any content you upload, post, or transmit through the Service ("Your Content"). By submitting Your Content, you grant us a worldwide, non-exclusive, royalty-free, perpetual, irrevocable, and sublicensable license to use, reproduce, modify, adapt, publish, translate, and distribute Your Content solely for the purpose of providing and improving the Service.
              </p>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                You represent and warrant that Your Content does not violate any third-party rights and that you have all necessary permissions to grant the license described above.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">5.2 Our Intellectual Property</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                The Service, including its original content, features, functionality, design, and software, is owned by TheraP Track and protected by Indian and international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any material from the Service without our prior written consent, except for personal, non-commercial use as permitted by these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">6. Privacy and Data Protection</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                Your privacy is important to us. Our collection, use, and disclosure of your personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Service, you consent to the practices described in our Privacy Policy.
              </p>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                We comply with the Information Technology Act, 2000, and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, to protect your sensitive personal data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">7. Payment Terms</h2>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">7.1 Subscription Fees</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                Certain features of the Service may require payment of subscription fees. All fees are stated in Indian Rupees (INR) and are exclusive of applicable taxes. You agree to pay all fees associated with your use of paid features.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">7.2 Billing and Renewal</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                Subscription fees are billed in advance on a recurring basis (monthly or annual). Your subscription will automatically renew unless you cancel before the renewal date. You authorize us to charge your payment method for all fees.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">7.3 Refunds</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                Refund policies are subject to our discretion and applicable laws. Generally, subscription fees are non-refundable unless otherwise required by law or specified in writing.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">7.4 Price Changes</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                We reserve the right to modify subscription fees at any time. We will provide advance notice of any price changes. Continued use of paid features after a price change constitutes acceptance of the new pricing.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">8. Medical and Health Disclaimer</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                <strong>IMPORTANT:</strong> TheraP Track is a tool for tracking therapy progress and is not intended to provide medical advice, diagnosis, or treatment. The Service is not a substitute for professional medical care, therapy, or consultation.
              </p>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                You acknowledge and agree that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-dark-text-secondary mb-4">
                <li>The Service does not provide medical or mental health services</li>
                <li>We are not a healthcare provider and do not practice medicine</li>
                <li>Any information or content provided through the Service is for informational purposes only</li>
                <li>You should consult qualified healthcare professionals for medical advice</li>
                <li>In case of a medical emergency, contact emergency services immediately</li>
              </ul>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                We disclaim any liability for decisions made or actions taken based on information or data from the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">9. Disclaimers and Limitations of Liability</h2>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">9.1 Service "As Is"</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">9.2 Limitation of Liability</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                To the maximum extent permitted by applicable law, TheraP Track, its affiliates, officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of or inability to use the Service.
              </p>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                Our total liability to you for all claims arising out of or relating to the Service shall not exceed the amount you paid to us in the 12 months preceding the claim, or INR 1,000, whichever is greater.
              </p>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                Some jurisdictions do not allow the exclusion of certain warranties or limitations of liability, so some of the above limitations may not apply to you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">10. Indemnification</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                You agree to indemnify, defend, and hold harmless TheraP Track, its affiliates, officers, directors, employees, and agents from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including reasonable attorney's fees) arising from:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-dark-text-secondary mb-4">
                <li>Your use of or access to the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party right, including privacy or intellectual property rights</li>
                <li>Your Content or any content you submit through the Service</li>
                <li>Your breach of any representation or warranty in these Terms</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">11. Termination</h2>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">11.1 Termination by You</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                You may terminate your account at any time by contacting us or using the account deletion feature in the Service settings.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">11.2 Termination by Us</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                We reserve the right to suspend or terminate your account and access to the Service immediately, without prior notice, if you:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-dark-text-secondary mb-4">
                <li>Violate these Terms or any applicable law</li>
                <li>Engage in fraudulent, abusive, or illegal activity</li>
                <li>Fail to pay required fees</li>
                <li>Use the Service in a manner that harms us or other users</li>
                <li>At our sole discretion, for any reason or no reason</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">11.3 Effect of Termination</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                Upon termination, your right to use the Service will immediately cease. We may delete your account and data, subject to our data retention policies and applicable law. Provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">12. Dispute Resolution and Governing Law</h2>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">12.1 Governing Law</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising out of or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts in [Jurisdiction, e.g., Mumbai, Maharashtra], India.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">12.2 Dispute Resolution</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                In the event of any dispute, controversy, or claim arising out of or relating to these Terms, the parties agree to first attempt to resolve the dispute through good-faith negotiations. If the dispute cannot be resolved through negotiations, it shall be resolved through binding arbitration in accordance with the Arbitration and Conciliation Act, 2015, or through the appropriate courts in India.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">13. Modifications to Terms</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                We reserve the right to modify these Terms at any time. We will notify you of material changes by:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-dark-text-secondary mb-4">
                <li>Posting the updated Terms on our website</li>
                <li>Updating the "Last Updated" date at the top of these Terms</li>
                <li>Sending you an email notification (if applicable)</li>
              </ul>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                Your continued use of the Service after such modifications constitutes acceptance of the updated Terms. If you do not agree with the modifications, you must discontinue use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">14. Severability</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such provision shall be modified to the minimum extent necessary to make it valid, legal, and enforceable. If such modification is not possible, the provision shall be severed from these Terms, and the remaining provisions shall remain in full force and effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">15. Entire Agreement</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                These Terms, together with our Privacy Policy and any other legal notices or agreements published by us on the Service, constitute the entire agreement between you and TheraP Track regarding your use of the Service and supersede all prior agreements and understandings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">16. Waiver</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                No waiver of any term or condition of these Terms shall be deemed a further or continuing waiver of such term or condition or any other term or condition. Any failure by us to assert a right or provision under these Terms shall not constitute a waiver of such right or provision.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">17. Contact Information</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                If you have any questions, concerns, or complaints regarding these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 dark:bg-dark-bg-secondary p-4 rounded-lg">
                <p className="text-gray-700 dark:text-dark-text-secondary mb-2"><strong>TheraP Track</strong></p>
                <p className="text-gray-700 dark:text-dark-text-secondary mb-1">Email: support@theraptrack.com</p>
                <p className="text-gray-700 dark:text-dark-text-secondary mb-1">Phone: +919742991324</p>
                <p className="text-gray-700 dark:text-dark-text-secondary">Address: 11/2, Ramar Koil Street, Hosur, Tamil Nadu, India, PIN-635109</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">18. Acknowledgement</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF SERVICE, UNDERSTAND THEM, AND AGREE TO BE BOUND BY THEM. IF YOU DO NOT AGREE TO THESE TERMS, YOU MUST NOT USE THE SERVICE.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;

