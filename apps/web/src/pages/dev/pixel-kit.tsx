import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { CapabilityPicker } from "../../components/capability-picker.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Drawer } from "../../components/drawer.tsx";
import { EmptyState } from "../../components/empty-state.tsx";
import { Field } from "../../components/field.tsx";
import { Menu } from "../../components/menu.tsx";
import { PixelIcon, pixelIconNames } from "../../components/pixel-icon.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { Switch } from "../../components/switch.tsx";
import { Toast } from "../../components/toast.tsx";
import { RelayFilters } from "../relay/relay-filters.tsx";
import "../../styles/pixel-kit.css";

export function PixelKit() {
  const [segment, setSegment] = useState("board");
  const [switchOn, setSwitchOn] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [formCapabilities, setFormCapabilities] = useState<string[]>(["coding"]);
  const [formPriority, setFormPriority] = useState("normal");
  const [formEnabled, setFormEnabled] = useState(true);
  const [filterRecipient, setFilterRecipient] = useState("all");
  const [filterKind, setFilterKind] = useState("all");
  const [filterTask, setFilterTask] = useState("all");
  return (
    <main data-ui="pixel-kit">
      <header>
        <h1>Pixel kit</h1>
        <p>事务所菜单 · 控件、状态与材料</p>
      </header>
      <section>
        <h2>按钮 / Buttons</h2>
        <div className="kit-row">
          {(["primary", "secondary", "ghost", "danger"] as const).map((variant) => (
            <div key={variant} className="kit-stack">
              <strong>{variant}</strong>
              <Button variant={variant}>常态</Button>
              <Button variant={variant} className="kit-hover">
                悬停
              </Button>
              <Button variant={variant} className="kit-pressed">
                按下
              </Button>
              <Button variant={variant} disabled>
                禁用
              </Button>
              <Button variant={variant} className="kit-focus">
                焦点
              </Button>
            </div>
          ))}
          <div className="kit-stack">
            <strong>图标</strong>
            <Button variant="icon" aria-label="刷新" title="刷新">
              <PixelIcon name="refresh" />
            </Button>
            <Button variant="icon" aria-label="复制" title="复制">
              <PixelIcon name="copy" />
            </Button>
          </div>
        </div>
      </section>
      <section>
        <h2>输入 / Fields</h2>
        <div className="kit-grid">
          <Field label="标题" placeholder="输入标题" required />
          <Field label="日期" type="date" />
          <Field label="搜索" type="search" placeholder="搜索任务" />
          <label data-ui="field-label">
            下拉
            <select defaultValue="a">
              <option value="a">选项 A</option>
              <option value="b">选项 B</option>
            </select>
          </label>
        </div>
        <div className="kit-row">
          <Segmented
            label="视图"
            options={[
              { value: "board", label: "平铺" },
              { value: "list", label: "列表" },
            ]}
            value={segment}
            onChange={setSegment}
          />
          <Switch label="启用" checked={switchOn} onChange={setSwitchOn} />
          <span className="kit-badge">8</span>
          <span className="kit-status">
            <PixelIcon name="check" />
            运行中
          </span>
        </div>
      </section>
      <section>
        <h2>弹出筛选面板 / Filter popover</h2>
        <RelayFilters
          recipient={filterRecipient}
          onRecipient={setFilterRecipient}
          kind={filterKind}
          onKind={setFilterKind}
          task={filterTask}
          onTask={setFilterTask}
        />
      </section>
      <section>
        <h2>图标 / Icons</h2>
        <div className="kit-icons">
          {pixelIconNames.map((name) => (
            <div key={name}>
              <PixelIcon name={name} />
              {name}
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>完整表单 / Full form</h2>
        <form className="kit-form" onSubmit={(event) => event.preventDefault()}>
          <Field label="任务标题" placeholder="输入标题" required />
          <CapabilityPicker
            label="能力"
            value={formCapabilities}
            onChange={setFormCapabilities}
            agents={[]}
            mode="multi"
            description="选择预设能力，或输入自定义能力。"
          />
          <Segmented
            formField
            label="优先级"
            value={formPriority}
            onChange={setFormPriority}
            options={[
              { value: "low", label: "低" },
              { value: "normal", label: "普通" },
              { value: "high", label: "高" },
              { value: "urgent", label: "紧急" },
            ]}
          />
          <div className="kit-form-row">
            <Field label="截止日期" type="datetime-local" />
            <div data-ui="form-switch">
              <span>启用</span>
              <Switch label="启用" checked={formEnabled} onChange={setFormEnabled} />
            </div>
          </div>
          <div className="kit-form-actions">
            <Button>取消</Button>
            <Button type="submit" variant="primary">
              确认
            </Button>
          </div>
        </form>
      </section>
      <section>
        <h2>内容 / Content</h2>
        <div className="kit-row">
          <div data-ui="task-folder" className="kit-tray">
            <div data-ui="column-heading">
              <PixelIcon name="desk" />
              <h2>待领取</h2>
              <span data-ui="column-count">2</span>
            </div>
            <div data-ui="card" data-status="in_progress">
              <span data-ui="card-title">让卡片标题可读且可扫描</span>
              <p>昨天 · Codex</p>
            </div>
          </div>
          <div className="kit-list">
            <div className="kit-list-head">任务 / 状态 / 操作</div>
            <div className="kit-list-row">
              索引卡样张 <span className="kit-status">运行中</span>
              <Button variant="icon" title="更多" aria-label="更多">
                <PixelIcon name="more" />
              </Button>
            </div>
          </div>
        </div>
      </section>
      <section>
        <h2>浮层 / Overlays</h2>
        <div className="kit-row">
          <Button onClick={() => setDialog(true)}>弹窗</Button>
          <Button onClick={() => setDrawer(true)}>抽屉</Button>
          <Menu
            label="更多操作"
            trigger="菜单"
            items={[
              { label: "刷新", onSelect: () => setToast("已刷新") },
              { label: "历史", onSelect: () => setToast("历史") },
            ]}
          />
          <Button onClick={() => setToast("任务已更新")}>提示</Button>
        </div>
      </section>
      <section>
        <h2>空状态 / Empty states</h2>
        <EmptyState
          title="还没有定时任务"
          description="创建定时任务，让工作准时进行。"
          scene="calendar"
          action={{ label: "新建一个", onClick: () => setToast("新建定时任务") }}
        />
      </section>
      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title="发布任务"
        footer={
          <>
            <Button onClick={() => setDialog(false)}>取消</Button>
            <Button variant="primary" onClick={() => setDialog(false)}>
              确认
            </Button>
          </>
        }
      >
        <Field label="标题" placeholder="新任务" />
      </Dialog>
      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="任务详情"
        footer={
          <Button variant="primary" onClick={() => setDrawer(false)}>
            完成
          </Button>
        }
      >
        <p>抽屉正文可以滚动，底栏保持可见。</p>
      </Drawer>
      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  );
}
