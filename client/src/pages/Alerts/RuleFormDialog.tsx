import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@client/src/components/ui/form';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@client/src/components/ui/select';
import { Checkbox } from '@client/src/components/ui/checkbox';
import { Switch } from '@client/src/components/ui/switch';
import { Label } from '@client/src/components/ui/label';
import {
  METRIC_TYPE_OPTIONS,
  OPERATOR_OPTIONS,
  LEVEL_OPTIONS,
} from '@shared/api.interface';
import type { AlertRuleItem, CreateAlertRuleRequest } from '@shared/api.interface';
import * as alertsApi from '@client/src/api/alerts';

const NOTIFY_TYPE_OPTIONS = [
  { value: 'platform', label: '站内通知' },
  { value: 'email', label: '邮件通知' },
  { value: 'feishu', label: '飞书通知' },
];

const ruleFormSchema = z.object({
  name: z.string().min(1, '规则名称不能为空'),
  metricType: z.string().min(1, '请选择监控指标'),
  operator: z.string().min(1, '请选择比较运算符'),
  threshold: z.coerce.number().min(0, '阈值不能为负数'),
  level: z.string().min(1, '请选择预警级别'),
  notifyType: z.array(z.string()).min(1, '至少选择一种通知方式'),
  enabled: z.boolean(),
});

type RuleFormValues = z.infer<typeof ruleFormSchema>;

interface RuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRule?: AlertRuleItem;
  onSuccess: () => void;
}

const RuleFormDialog: React.FC<RuleFormDialogProps> = ({
  open,
  onOpenChange,
  editingRule,
  onSuccess,
}) => {
  const isEditing = !!editingRule;

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      name: '',
      metricType: '',
      operator: '',
      threshold: 0,
      level: '',
      notifyType: [],
      enabled: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (editingRule) {
        form.reset({
          name: editingRule.name,
          metricType: editingRule.metricType,
          operator: editingRule.operator,
          threshold: editingRule.threshold,
          level: editingRule.level,
          notifyType: editingRule.notifyType,
          enabled: editingRule.enabled,
        });
      } else {
        form.reset({
          name: '',
          metricType: '',
          operator: '',
          threshold: 0,
          level: '',
          notifyType: [],
          enabled: true,
        });
      }
    }
  }, [open, editingRule, form]);

  const onSubmit = async (values: RuleFormValues): Promise<void> => {
    try {
      const payload: CreateAlertRuleRequest = {
        name: values.name,
        metricType: values.metricType,
        operator: values.operator,
        threshold: values.threshold,
        level: values.level,
        notifyType: values.notifyType,
        notifyUsers: [],
        enabled: values.enabled,
      };

      if (isEditing && editingRule) {
        await alertsApi.updateRule(editingRule.id, payload);
        toast.success('规则更新成功');
      } else {
        await alertsApi.createRule(payload);
        toast.success('规则创建成功');
      }
      onSuccess();
    } catch (err: unknown) {
      logger.error('Failed to save rule', err);
      toast.error(isEditing ? '更新失败' : '创建失败');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-sm">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '编辑预警规则' : '新建预警规则'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>规则名称</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入规则名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="metricType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>监控指标</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择监控指标" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {METRIC_TYPE_OPTIONS.map(
                        (o: (typeof METRIC_TYPE_OPTIONS)[number]) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="operator"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>比较运算符</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OPERATOR_OPTIONS.map(
                          (o: (typeof OPERATOR_OPTIONS)[number]) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>阈值</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="请输入阈值"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>预警级别</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择预警级别" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LEVEL_OPTIONS.map(
                        (o: (typeof LEVEL_OPTIONS)[number]) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notifyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>通知方式</FormLabel>
                  <div className="flex gap-4">
                    {NOTIFY_TYPE_OPTIONS.map(
                      (opt: (typeof NOTIFY_TYPE_OPTIONS)[number]) => (
                        <div
                          key={opt.value}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            checked={field.value.includes(opt.value)}
                            onCheckedChange={(checked: boolean) => {
                              const next = checked
                                ? [...field.value, opt.value]
                                : field.value.filter(
                                    (v: string) => v !== opt.value,
                                  );
                              field.onChange(next);
                            }}
                          />
                          <Label className="text-sm font-normal cursor-pointer">
                            {opt.label}
                          </Label>
                        </div>
                      ),
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel className="mt-0">启用状态</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? '保存中...'
                  : isEditing
                    ? '更新'
                    : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { RuleFormDialog };
