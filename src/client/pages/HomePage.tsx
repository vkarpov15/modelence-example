import { useState, useCallback, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modelenceQuery, modelenceMutation, createQueryKey } from '@modelence/react-query';
import { useSession } from 'modelence/client';
import { Check, X } from 'lucide-react';
import Page from '@/client/components/Page';
import { Input } from '@/client/components/ui/Input';
import { Button } from '@/client/components/ui/Button';
import { cn } from '@/client/lib/utils';

type Todo = {
  _id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
};

export default function HomePage() {
  const { user } = useSession();

  return (
    <Page className="bg-gray-50">
      <div className="max-w-xl mx-auto flex-1 py-12 px-4">
        {user ? <TodoList /> : <SignInPrompt />}
      </div>
    </Page>
  );
}

function SignInPrompt() {
  return (
    <div className="text-center py-20">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">todo.txt</h1>
      <p className="text-gray-500 mb-8">A simple cloud todo list</p>
      <div className="flex gap-3 justify-center">
        <a href="/login">
          <Button>Sign in</Button>
        </a>
        <a href="/signup">
          <Button variant="outline">Sign up</Button>
        </a>
      </div>
    </div>
  );
}

function TodoList() {
  const [newTodo, setNewTodo] = useState('');
  const queryClient = useQueryClient();

  const { data: todos = [], isLoading } = useQuery({
    ...modelenceQuery<Todo[]>('todo.getTodos'),
  });

  const { mutate: addTodo, isPending: isAdding } = useMutation({
    ...modelenceMutation('todo.addTodo'),
    onSuccess: () => {
      setNewTodo('');
      queryClient.invalidateQueries({ queryKey: createQueryKey('todo.getTodos') });
    },
  });

  const { mutate: toggleTodo } = useMutation({
    ...modelenceMutation('todo.toggleTodo'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createQueryKey('todo.getTodos') });
    },
  });

  const { mutate: deleteTodo } = useMutation({
    ...modelenceMutation('todo.deleteTodo'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createQueryKey('todo.getTodos') });
    },
  });

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const text = newTodo.trim();
      if (text) {
        addTodo({ text });
      }
    },
    [newTodo, addTodo]
  );

  const incompleteTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-medium text-gray-900 mb-1">todo.txt</h1>
        <p className="text-sm text-gray-500">
          Tasks clear at midnight if not completed
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <Input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a task..."
            disabled={isAdding}
            autoFocus
            className="flex-1"
          />
          <Button type="submit" disabled={isAdding || !newTodo.trim()}>
            Add
          </Button>
        </div>
      </form>

      {isLoading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : todos.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          No tasks yet. Add one above.
        </div>
      ) : (
        <div className="space-y-6">
          {incompleteTodos.length > 0 && (
            <ul className="space-y-1">
              {incompleteTodos.map((todo) => (
                <TodoItem
                  key={todo._id}
                  todo={todo}
                  onToggle={() => toggleTodo({ todoId: todo._id })}
                  onDelete={() => deleteTodo({ todoId: todo._id })}
                />
              ))}
            </ul>
          )}

          {completedTodos.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                Completed
              </p>
              <ul className="space-y-1">
                {completedTodos.map((todo) => (
                  <TodoItem
                    key={todo._id}
                    todo={todo}
                    onToggle={() => toggleTodo({ todoId: todo._id })}
                    onDelete={() => deleteTodo({ todoId: todo._id })}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TodoItem({
  todo,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group flex items-center gap-3 py-2 px-3 -mx-3 rounded-lg hover:bg-white transition-colors">
      <button
        onClick={onToggle}
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
          todo.completed
            ? 'bg-gray-900 border-gray-900 text-white'
            : 'border-gray-300 hover:border-gray-400'
        )}
      >
        {todo.completed && <Check className="w-3 h-3" />}
      </button>
      <span
        className={cn(
          'flex-1 text-sm',
          todo.completed ? 'text-gray-400 line-through' : 'text-gray-900'
        )}
      >
        {todo.text}
      </span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
      >
        <X className="w-4 h-4" />
      </button>
    </li>
  );
}
