import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Trash2, Plus, Pencil, Check, X, Link as LinkIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { createDevice, deleteDevice, listDevices, updateDevice } from "@/lib/api";

const COLORS = ["#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#A855F7", "#EC4899", "#14B8A6"];

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const refresh = async () => setDevices(await listDevices());

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 5000);
    return () => clearInterval(i);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const d = await createDevice(name.trim(), color);
      setName("");
      toast.success(`Created ${d.name} · code ${d.code}`);
      refresh();
    } catch (_) {
      toast.error("Could not create device");
    }
  };

  const copyLink = (code) => {
    const url = `${window.location.origin}/tracker/${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Tracker link copied");
  };
  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied");
  };

  const remove = async (d) => {
    if (!window.confirm(`Delete "${d.name}"? This removes its trail history.`)) return;
    await deleteDevice(d.id);
    toast.success("Device removed");
    refresh();
  };

  const startEdit = (d) => {
    setEditingId(d.id);
    setEditName(d.name);
  };
  const saveEdit = async (d) => {
    await updateDevice(d.id, { name: editName });
    setEditingId(null);
    refresh();
  };

  return (
    <div className="mx-auto max-w-[1200px] p-4">
      <div className="overline mt-4">Fleet Management</div>
      <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">Devices</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Pair as many old phones as you like. Each device gets a unique 6-character code to enter on
        the mobile tracker page.
      </p>

      {/* Create form */}
      <form
        onSubmit={submit}
        data-testid="create-device-form"
        className="mt-6 flex flex-col gap-3 border border-zinc-800 bg-zinc-950/60 p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <div className="overline mb-1">Name</div>
          <input
            data-testid="new-device-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Family Car"
            className="w-full border border-zinc-800 bg-zinc-950 px-3 py-3 font-mono text-sm outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <div className="overline mb-1">Trail color</div>
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className={`h-9 w-9 border ${
                  color === c ? "border-white" : "border-zinc-800"
                }`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
        <button
          type="submit"
          data-testid="new-device-submit"
          className="flex items-center gap-2 bg-amber-500 px-5 py-3 text-sm font-bold uppercase tracking-widest text-black hover:bg-amber-400"
        >
          <Plus size={16} /> Create device
        </button>
      </form>

      {/* Table */}
      <div className="mt-6 border border-zinc-800">
        <div className="grid grid-cols-12 gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-2 text-[10px] uppercase tracking-widest text-zinc-500">
          <div className="col-span-4">Device</div>
          <div className="col-span-2">Code</div>
          <div className="col-span-2">Last seen</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {devices.length === 0 && (
          <div className="p-6 text-center text-sm text-zinc-500">
            No devices yet. Create your first tracker above.
          </div>
        )}
        {devices.map((d) => {
          const isOnline = d.last_seen && Date.now() - new Date(d.last_seen).getTime() < 60_000;
          return (
            <div
              key={d.id}
              data-testid={`device-item-${d.code}`}
              className="grid grid-cols-12 items-center gap-3 border-b border-zinc-900 px-4 py-3"
            >
              <div className="col-span-4 flex items-center gap-3">
                <span className="h-3 w-3" style={{ background: d.color }} />
                {editingId === d.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                  />
                ) : (
                  <span className="font-bold">{d.name}</span>
                )}
              </div>
              <div className="col-span-2 font-mono text-amber-400">{d.code}</div>
              <div className="col-span-2 text-xs text-zinc-400">
                {d.last_seen ? formatDistanceToNow(new Date(d.last_seen), { addSuffix: true }) : "never"}
              </div>
              <div className="col-span-2 text-xs">
                <span className={`inline-flex items-center gap-1 ${isOnline ? "text-emerald-400" : "text-zinc-500"}`}>
                  <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-zinc-600"}`} />
                  {isOnline ? "online" : "offline"}
                </span>
              </div>
              <div className="col-span-2 flex items-center justify-end gap-1">
                {editingId === d.id ? (
                  <>
                    <IconBtn onClick={() => saveEdit(d)} title="Save" testid={`save-${d.code}`}>
                      <Check size={14} />
                    </IconBtn>
                    <IconBtn onClick={() => setEditingId(null)} title="Cancel">
                      <X size={14} />
                    </IconBtn>
                  </>
                ) : (
                  <>
                    <IconBtn onClick={() => startEdit(d)} title="Rename" testid={`edit-${d.code}`}>
                      <Pencil size={14} />
                    </IconBtn>
                    <IconBtn onClick={() => copyCode(d.code)} title="Copy code" testid={`copy-code-${d.code}`}>
                      <Copy size={14} />
                    </IconBtn>
                    <IconBtn onClick={() => copyLink(d.code)} title="Copy tracker link" testid={`copy-link-${d.code}`}>
                      <LinkIcon size={14} />
                    </IconBtn>
                    <IconBtn onClick={() => remove(d)} title="Delete" testid={`delete-${d.code}`}>
                      <Trash2 size={14} />
                    </IconBtn>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title, testid }) {
  return (
    <button
      onClick={onClick}
      title={title}
      data-testid={testid}
      className="border border-zinc-800 p-2 text-zinc-400 hover:border-amber-500 hover:text-amber-400"
    >
      {children}
    </button>
  );
}
