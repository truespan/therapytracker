import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
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
              <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center p-2 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                <img
                  src="/TheraPTrackLogoBgRemoved.png"
                  alt="TheraP Track Logo"
                  className="h-full w-full object-contain"
                />
              </div>
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-dark-text-primary mb-6 text-center">Privacy Policy</h1>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-8">Last Updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">1. Introduction</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                Welcome to TheraP Track ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our therapy tracking application and related services (collectively, the "Service").
              </p>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                This Privacy Policy is governed by the laws of India, including the Information Technology Act, 2000, and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 ("IT Rules"), and any amendments thereto.
              </p>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                By accessing or using our Service, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, please do not use our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">2.1 Personal Information</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                We collect information that you provide directly to us, including but not limited to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-dark-text-secondary mb-4">
                <li>Name, email address, phone number, and other contact information</li>
                <li>Account credentials (username, password)</li>
                <li>Profile information, including profile pictures</li>
                <li>Therapy session data, assessments, and progress ratings</li>
                <li>Communication preferences and feedback</li>
                <li>Payment information (processed through secure third-party payment gateways)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">2.2 Automatically Collected Information</h3>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                When you use our Service, we automatically collect certain information, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-dark-text-secondary mb-4">
                <li>Device information (device type, operating system, browser type)</li>
                <li>IP address and location data</li>
                <li>Usage data, including pages visited, features used, and time spent on the Service</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Log files and analytics data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                We use the collected information for the following purposes:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-dark-text-secondary mb-4">
                <li>To provide, maintain, and improve our Service</li>
                <li>To process your registration and manage your account</li>
                <li>To facilitate therapy sessions and track your progress</li>
                <li>To communicate with you about your account, updates, and support requests</li>
                <li>To send you promotional materials and newsletters (with your consent)</li>
                <li>To detect, prevent, and address technical issues and security threats</li>
                <li>To comply with legal obligations and enforce our Terms of Service</li>
                <li>To conduct research and analytics to improve our Service</li>
                <li>To personalize your experience and provide relevant content</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">4. Information Sharing and Disclosure</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-dark-text-secondary mb-4">
                <li><strong>Service Providers:</strong> We may share information with third-party service providers who perform services on our behalf, such as hosting, analytics, payment processing, and email delivery. These providers are contractually obligated to protect your information.</li>
                <li><strong>Therapists and Organizations:</strong> If you are a user, your information may be shared with your assigned therapist or organization in accordance with your consent and our Service functionality.</li>
                <li><strong>Legal Requirements:</strong> We may disclose information if required by law, court order, or governmental authority, or to protect our rights, property, or safety, or that of our users or others.</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
                <li><strong>With Your Consent:</strong> We may share information with your explicit consent or as otherwise disclosed at the time of collection.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">5. Data Security</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                We implement reasonable security practices and procedures in accordance with the IT Rules to protect your personal information from unauthorized access, alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-dark-text-secondary mb-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Employee training on data protection</li>
                <li>Secure server infrastructure and backup systems</li>
              </ul>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">6. Data Retention</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When your information is no longer needed, we will securely delete or anonymize it.
              </p>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                You may request deletion of your account and associated data at any time by contacting us. We will process such requests in accordance with applicable law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">7. Your Rights and Choices</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                Subject to applicable law, you have the following rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-dark-text-secondary mb-4">
                <li><strong>Access:</strong> Request access to your personal information and receive a copy of the data we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information, subject to certain exceptions</li>
                <li><strong>Withdrawal of Consent:</strong> Withdraw your consent to processing of personal information, where applicable</li>
                <li><strong>Data Portability:</strong> Request transfer of your data to another service provider, where technically feasible</li>
                <li><strong>Objection:</strong> Object to certain types of processing of your information</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time</li>
              </ul>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                To exercise these rights, please contact us using the contact information provided at the end of this Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">8. Cookies and Tracking Technologies</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                We use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, and provide personalized content. You can control cookies through your browser settings; however, disabling cookies may affect the functionality of our Service.
              </p>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                We may use third-party analytics services (such as Google Analytics) to help us understand how users interact with our Service. These services may use cookies and similar technologies to collect information about your use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">9. Children's Privacy</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child without parental consent, we will take steps to delete such information promptly.
              </p>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">10. Third-Party Links</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                Our Service may contain links to third-party websites or services. We are not responsible for the privacy practices or content of such third parties. We encourage you to review the privacy policies of any third-party sites you visit.
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-dark-text-secondary mb-4">
                <li><strong>Google OAuth:</strong> Used for secure authentication</li>
                <li><strong>Google OAuth:</strong> Used for Google Calendar integration</li>
                <li><strong>Google Analytics:</strong> Used for analytics and reporting</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">11. International Data Transfers</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                Your information may be transferred to and processed in countries other than India, where our servers or service providers are located. By using our Service, you consent to such transfers. We ensure that appropriate safeguards are in place to protect your information in accordance with this Privacy Policy and applicable laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">12. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of any material changes by:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-dark-text-secondary mb-4">
                <li>Posting the updated Privacy Policy on our website</li>
                <li>Updating the "Last Updated" date at the top of this policy</li>
                <li>Sending you an email notification (if applicable)</li>
              </ul>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                Your continued use of the Service after such changes constitutes acceptance of the updated Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">13. Grievance Redressal</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                In accordance with the IT Rules, if you have any grievances or complaints regarding the processing of your personal information, you may contact our Grievance Officer:
              </p>
              <div className="bg-gray-50 dark:bg-dark-bg-secondary p-4 rounded-lg mb-4">
                <p className="text-gray-700 dark:text-dark-text-secondary mb-2"><strong>Grievance Officer</strong></p>
                <p className="text-gray-700 dark:text-dark-text-secondary mb-1">Email: support@theraptrack.com</p>
                <p className="text-gray-700 dark:text-dark-text-secondary mb-1">Address: 11/2, Ramar Koil Street, Hosur, Tamil Nadu, India, PIN-635109</p>
                <p className="text-gray-700 dark:text-dark-text-secondary">We will respond to your grievance within 30 days from the date of receipt.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">14. Contact Us</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 dark:bg-dark-bg-secondary p-4 rounded-lg">
                <p className="text-gray-700 dark:text-dark-text-secondary mb-2"><strong>TheraP Track</strong></p>
                <p className="text-gray-700 dark:text-dark-text-secondary mb-1">Email: support@theraptrack.com</p>
                <p className="text-gray-700 dark:text-dark-text-secondary mb-1">Phone: +919742991324</p>
                <p className="text-gray-700 dark:text-dark-text-secondary">Address: 11/2, Ramar Koil Street, Hosur, Tamil Nadu, India, PIN-635109</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">15. Consent</h2>
              <p className="text-gray-700 dark:text-dark-text-secondary">
                By using our Service, you consent to the collection, use, and disclosure of your information as described in this Privacy Policy. If you do not agree with any part of this policy, please discontinue use of the Service.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

