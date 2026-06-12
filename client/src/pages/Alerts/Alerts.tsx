import React from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@client/src/components/ui/tabs';
import { AlertRules } from './AlertRules';
import { AlertRecords } from './AlertRecords';

const AlertsPage: React.FC = () => {
  return (
    <div className="p-4 max-w-[1400px] mx-auto">
      <h1 className="text-xl font-semibold mb-4">预警管理</h1>
      <Tabs defaultValue="rules">
        <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto w-full justify-start gap-0">
          <TabsTrigger
            value="rules"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
          >
            预警规则
          </TabsTrigger>
          <TabsTrigger
            value="records"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
          >
            预警记录
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="mt-4">
          <AlertRules />
        </TabsContent>
        <TabsContent value="records" className="mt-4">
          <AlertRecords />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AlertsPage;
