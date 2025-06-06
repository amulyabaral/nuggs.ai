import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext'; // Assuming you might want the header
import AdScript from '../components/AdScript';

export default function PrivacyPolicy() {
  const { user } = useAuth(); // For the header, if you keep it consistent

  return (
    <div className="pageContainer">
      <Head>
        <title>Privacy Policy | nuggs.ai</title>
        <meta name="description" content="Read the Privacy Policy for nuggs.ai." />
        <meta name="robots" content="noindex, follow" /> {/* Optional: tell search engines not to index it */}
        <AdScript />
      </Head>

      {/* Consistent Header */}
      <header className="mainHeader">
        <Link href="/" className="logoLink">
          <div className="logoArea">
            <h1 className="logoText">
              <img src="/logo.png" alt="Nuggs.ai logo" className="headerLogoImage" /> nuggs.ai
            </h1>
          </div>
        </Link>
        <nav>
          <Link href="/" className="navLink">
            Home
          </Link>
          <Link href="/blog" className="navLink">
            Blog
          </Link>
          {user ? (
            <Link href="/dashboard" className="navLink">
              Dashboard
            </Link>
          ) : (
            <Link href="/#login" className="navLink authNavButton" scroll={false} onClick={(e) => {
              // This is a placeholder. Ideally, your AuthModal logic would be centralized
              // or you'd pass a function from _app.js to open it.
              e.preventDefault();
              alert("Login modal would open here. For now, navigate to home and log in.");
              window.location.href = '/'; 
            }}>
              Log In
            </Link>
          )}
        </nav>
      </header>

      <main className="contentContainer" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1.5rem' }}>
        <h1>Privacy Policy</h1>
        <p>Last Updated: May 24, 2024</p>

        <section>
          <h2>Introduction</h2>
          <p>
            Welcome to nuggs.ai ("we", "us", or "our"). We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice, or our practices with regards to your personal information, please contact us at amulyabaral2@gmail.com.
          </p>
          <p>
            This privacy notice describes how we might use your information if you:
            <ul>
              <li>Visit our website at https://nuggs.ai</li>
              <li>Engage with us in other related ways ― including any sales, marketing, or events</li>
            </ul>
          </p>
          <p>
            In this privacy notice, if we refer to:
            <ul>
              <li><strong>"Website,"</strong> we are referring to any website of ours that references or links to this policy</li>
              <li><strong>"Services,"</strong> we are referring to our Website, and other related services, including any sales, marketing, or events</li>
            </ul>
          </p>
          <p>
            The purpose of this privacy notice is to explain to you in the clearest way possible what information we collect, how we use it, and what rights you have in relation to it. If there are any terms in this privacy notice that you do not agree with, please discontinue use of our Services immediately.
          </p>
        </section>

        <section>
          <h2>1. WHAT INFORMATION DO WE COLLECT?</h2>
          <p><strong>Personal information you disclose to us</strong></p>
          <p>
            <em>In Short: We collect personal information that you provide to us.</em>
          </p>
          <p>
            We collect personal information that you voluntarily provide to us when you register on the Website, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Website or otherwise when you contact us.
          </p>
          <p>
            The personal information that we collect depends on the context of your interactions with us and the Website, the choices you make and the products and features you use. The personal information we collect may include the following:
            <ul>
              <li><strong>Email Address:</strong> We collect your email address when you sign up for an account.</li>
              <li><strong>Payment Data:</strong> We may collect data necessary to process your payment if you make purchases, such as your payment instrument number (such as a credit card number), and the security code associated with your payment instrument. All payment data is stored by our payment processor (e.g., Stripe) and you should review its privacy policies and contact the payment processor directly to respond to your questions.</li>
            </ul>
          </p>
          <p>All personal information that you provide to us must be true, complete and accurate, and you must notify us of any changes to such personal information.</p>

          <p><strong>Information automatically collected</strong></p>
          <p>
            <em>In Short: Some information — such as your Internet Protocol (IP) address and/or browser and device characteristics — is collected automatically when you visit our Website.</em>
          </p>
          <p>
            We automatically collect certain information when you visit, use or navigate the Website. This information does not reveal your specific identity (like your name or contact information) but may include device and usage information, such as your IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, location, information about how and when you use our Website and other technical information. This information is primarily needed to maintain the security and operation of our Website, and for our internal analytics and reporting purposes.
          </p>
          <p>
            Like many businesses, we also collect information through cookies and similar technologies.
          </p>
        </section>

        <section>
          <h2>2. HOW DO WE USE YOUR INFORMATION?</h2>
          <p>
            <em>In Short: We process your information for purposes based on legitimate business interests, the fulfillment of our contract with you, compliance with our legal obligations, and/or your consent.</em>
          </p>
          <p>
            We use personal information collected via our Website for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations. We indicate the specific processing grounds we rely on next to each purpose listed below.
          </p>
          <p>
            We use the information we collect or receive:
            <ul>
              <li><strong>To facilitate account creation and logon process.</strong> If you choose to link your account with us to a third-party account (such as your Google or Facebook account), we use the information you allowed us to collect from those third parties to facilitate account creation and logon process for the performance of the contract.</li>
              <li><strong>To post testimonials.</strong> We post testimonials on our Website that may contain personal information. Prior to posting a testimonial, we will obtain your consent to use your name and the content of the testimonial. If you wish to update, or delete your testimonial, please contact us at amulyabaral2@gmail.com and be sure to include your name, testimonial location, and contact information.</li>
              <li><strong>Request feedback.</strong> We may use your information to request feedback and to contact you about your use of our Website.</li>
              <li><strong>To manage user accounts.</strong> We may use your information for the purposes of managing our account and keeping it in working order.</li>
              <li><strong>To send administrative information to you.</strong> We may use your personal information to send you product, service and new feature information and/or information about changes to our terms, conditions, and policies.</li>
              <li><strong>To protect our Services.</strong> We may use your information as part of our efforts to keep our Website safe and secure (for example, for fraud monitoring and prevention).</li>
              <li><strong>To enforce our terms, conditions and policies for business purposes, to comply with legal and regulatory requirements or in connection with our contract.</strong></li>
              <li><strong>To respond to legal requests and prevent harm.</strong> If we receive a subpoena or other legal request, we may need to inspect the data we hold to determine how to respond.</li>
              <li><strong>Fulfill and manage your orders.</strong> We may use your information to fulfill and manage your orders, payments, returns, and exchanges made through the Website.</li>
              <li><strong>Administer prize draws and competitions.</strong> We may use your information to administer prize draws and competitions when you elect to participate in our competitions.</li>
              <li><strong>To deliver and facilitate delivery of services to the user.</strong> We may use your information to provide you with the requested service.</li>
              <li><strong>To respond to user inquiries/offer support to users.</strong> We may use your information to respond to your inquiries and solve any potential issues you might have with the use of our Services.</li>
              <li><strong>To send you marketing and promotional communications.</strong> We and/or our third-party marketing partners may use the personal information you send to us for our marketing purposes, if this is in accordance with your marketing preferences. For example, when expressing an interest in obtaining information about us or our Website, subscribing to marketing or otherwise contacting us, we will collect personal information from you. You can opt-out of our marketing emails at any time.</li>
              <li><strong>Deliver targeted advertising to you.</strong> We may use your information to develop and display personalized content and advertising (and work with third parties who do so) tailored to your interests and/or location and to measure its effectiveness.</li>
            </ul>
          </p>
        </section>

        <section>
          <h2>3. WILL YOUR INFORMATION BE SHARED WITH ANYONE?</h2>
          <p>
            <em>In Short: We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.</em>
          </p>
          <p>
            We may process or share your data that we hold based on the following legal basis:
            <ul>
              <li><strong>Consent:</strong> We may process your data if you have given us specific consent to use your personal information for a specific purpose.</li>
              <li><strong>Legitimate Interests:</strong> We may process your data when it is reasonably necessary to achieve our legitimate business interests.</li>
              <li><strong>Performance of a Contract:</strong> Where we have entered into a contract with you, we may process your personal information to fulfill the terms of our contract.</li>
              <li><strong>Legal Obligations:</strong> We may disclose your information where we are legally required to do so in order to comply with applicable law, governmental requests, a judicial proceeding, court order, or legal process, such as in response to a court order or a subpoena (including in response to public authorities to meet national security or law enforcement requirements).</li>
              <li><strong>Vital Interests:</strong> We may disclose your information where we believe it is necessary to investigate, prevent, or take action regarding potential violations of our policies, suspected fraud, situations involving potential threats to the safety of any person and illegal activities, or as evidence in litigation in which we are involved.</li>
            </ul>
          </p>
          <p>
            More specifically, we may need to process your data or share your personal information in the following situations:
            <ul>
              <li><strong>Business Transfers.</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
              <li><strong>Vendors, Consultants and Other Third-Party Service Providers.</strong> We may share your data with third-party vendors, service providers, contractors or agents who perform services for us or on our behalf and require access to such information to do that work. Examples include: payment processing, data analysis, email delivery, hosting services, customer service and marketing efforts. We may allow selected third parties to use tracking technology on the Website, which will enable them to collect data on our behalf about how you interact with our Website over time. This information may be used to, among other things, analyze and track data, determine the popularity of certain content, pages or features, and better understand online activity. Unless described in this notice, we do not share, sell, rent or trade any of your information with third parties for their promotional purposes.</li>
            </ul>
          </p>
        </section>

        <section>
          <h2>4. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?</h2>
          <p>
            <em>In Short: We may use cookies and other tracking technologies to collect and store your information.</em>
          </p>
          <p>
            We may use cookies and similar tracking technologies (like web beacons and pixels) to access or store information. Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Policy (if applicable, otherwise, you can state that you use them for analytics and site functionality).
          </p>
        </section>

        <section>
          <h2>5. HOW LONG DO WE KEEP YOUR INFORMATION?</h2>
          <p>
            <em>In Short: We keep your information for as long as necessary to fulfill the purposes outlined in this privacy notice unless otherwise required by law.</em>
          </p>
          <p>
            We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy notice, unless a longer retention period is required or permitted by law (such as tax, accounting or other legal requirements). No purpose in this notice will require us keeping your personal information for longer than the period of time in which users have an account with us.
          </p>
          <p>
            When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information, or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible.
          </p>
        </section>

        <section>
          <h2>6. HOW DO WE KEEP YOUR INFORMATION SAFE?</h2>
          <p>
            <em>In Short: We aim to protect your personal information through a system of organizational and technical security measures.</em>
          </p>
          <p>
            We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Although we will do our best to protect your personal information, transmission of personal information to and from our Website is at your own risk. You should only access the Website within a secure environment.
          </p>
        </section>

        <section>
          <h2>7. WHAT ARE YOUR PRIVACY RIGHTS?</h2>
          <p>
            <em>In Short: In some regions, such as the European Economic Area (EEA) and United Kingdom (UK), you have rights that allow you greater access to and control over your personal information. You may review, change, or terminate your account at any time.</em>
          </p>
          <p>
            In some regions (like the EEA and UK), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; and (iv) if applicable, to data portability. In certain circumstances, you may also have the right to object to the processing of your personal information. To make such a request, please use the contact details provided below. We will consider and act upon any request in accordance with applicable data protection laws.
          </p>
          <p>
            If we are relying on your consent to process your personal information, you have the right to withdraw your consent at any time. Please note however that this will not affect the lawfulness of the processing before its withdrawal, nor will it affect the processing of your personal information conducted in reliance on lawful processing grounds other than consent.
          </p>
          <p>
            If you are a resident in the EEA or UK and you believe we are unlawfully processing your personal information, you also have the right to complain to your local data protection supervisory authority. You can find their contact details here: <a href="https://edpb.europa.eu/about-edpb/board/members_en" target="_blank" rel="noopener noreferrer">https://edpb.europa.eu/about-edpb/board/members_en</a>
          </p>
          <p>
            If you are a resident in Switzerland, the contact details for the data protection authorities are available here: <a href="https://www.edoeb.admin.ch/edoeb/en/home.html" target="_blank" rel="noopener noreferrer">https://www.edoeb.admin.ch/edoeb/en/home.html</a>
          </p>
          <p>
            <strong>Account Information:</strong> If you would at any time like to review or change the information in your account or terminate your account, you can log in to your account settings and update your user account or contact us using the contact information provided. Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, we may retain some information in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our Terms of Use and/or comply with applicable legal requirements.
          </p>
        </section>

        <section>
          <h2>8. CONTROLS FOR DO-NOT-TRACK FEATURES</h2>
          <p>
            Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard for online tracking is adopted that we must follow in the future, we will inform you about that practice in a revised version of this privacy notice.
          </p>
        </section>

        <section>
          <h2>9. DO CALIFORNIA RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</h2>
          <p>
            <em>In Short: Yes, if you are a resident of California, you are granted specific rights regarding access to your personal information.</em>
          </p>
          <p>
            California Civil Code Section 1798.83, also known as the "Shine The Light" law, permits our users who are California residents to request and obtain from us, once a year and free of charge, information about categories of personal information (if any) we disclosed to third parties for direct marketing purposes and the names and addresses of all third parties with which we shared personal information in the immediately preceding calendar year. If you are a California resident and would like to make such a request, please submit your request in writing to us using the contact information provided below.
          </p>
        </section>

        <section>
          <h2>10. DO WE MAKE UPDATES TO THIS NOTICE?</h2>
          <p>
            <em>In Short: Yes, we will update this notice as necessary to stay compliant with relevant laws.</em>
          </p>
          <p>
            We may update this privacy notice from time to time. The updated version will be indicated by an updated "Revised" date and the updated version will be effective as soon as it is accessible. If we make material changes to this privacy notice, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this privacy notice frequently to be informed of how we are protecting your information.
          </p>
        </section>

        <section>
          <h2>11. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</h2>
          <p>
            If you have questions or comments about this notice, you may email us at amulyabaral2@gmail.com or by post to:
          </p>
        </section>

        <style jsx>{`
          .contentContainer section {
            margin-bottom: 2rem;
          }
          .contentContainer h2 {
            font-size: 1.5rem;
            margin-top: 1.5rem;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
          }
          .contentContainer p, .contentContainer ul {
            line-height: 1.6;
            color: var(--text-secondary);
            margin-bottom: 1rem;
          }
          .contentContainer ul {
            list-style-position: inside;
            padding-left: 1rem;
          }
          .contentContainer strong {
            color: var(--text-primary);
          }
        `}</style>
      </main>
    </div>
  );
} 