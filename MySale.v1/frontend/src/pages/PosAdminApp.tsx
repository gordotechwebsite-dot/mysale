import { useState } from 'react';
import PosAdminLayout from './PosAdminLayout';
import SuperAdmin from './SuperAdmin';
import PosAdminFAQs from './PosAdminFAQs';

type TabType = 'dashboard' | 'tenants' | 'modules';

const sectionToTab: Record<string, TabType> = {
  dashboard: 'dashboard',
  tenants: 'tenants',
  modules: 'modules',
};

export default function PosAdminApp() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {
    if (activeSection === 'faqs') {
      return <PosAdminFAQs />;
    }
    const tab = sectionToTab[activeSection] || 'dashboard';
    return <SuperAdmin externalTab={tab} hideTabBar />;
  };

  return (
    <PosAdminLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderContent()}
    </PosAdminLayout>
  );
}
