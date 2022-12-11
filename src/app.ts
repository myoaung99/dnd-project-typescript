//* Validation
interface Validatable {
  value: string | number;
  require?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

interface ProjectDetail {
  id: string;
  title: string;
  description: string;
  numberOfPeople: number;
}

interface ValidatableFn {
  (validatableValue: Validatable): boolean;
}

enum ProjectStatus {
  Active,
  Finished,
}

const validate: ValidatableFn = (validatableValue) => {
  let isValid = true;
  //? check required
  if (validatableValue.require) {
    isValid = isValid && validatableValue.value.toString().length !== 0;
  }
  //? check string min length
  if (
    validatableValue.minLength != null &&
    typeof validatableValue.value === "string"
  ) {
    isValid =
      isValid &&
      validatableValue.value.trim().length >= validatableValue.minLength;
  }

  if (
    validatableValue.maxLength != null &&
    typeof validatableValue.value === "string"
  ) {
    isValid =
      isValid &&
      validatableValue.value.trim().length <= validatableValue.maxLength;
  }

  if (
    validatableValue.min != null &&
    typeof validatableValue.value === "number"
  ) {
    isValid = isValid && validatableValue.value >= validatableValue.min;
  }

  if (
    validatableValue.max != null &&
    typeof validatableValue.value === "number"
  ) {
    isValid = isValid && validatableValue.value <= validatableValue.max;
  }

  return isValid;
};

class Project {
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public numberOfPeople: number,
    public status: ProjectStatus
  ) {}
}

type Listener = (projects: Project[]) => void;

//? project Global State
class ProjectState {
  private static instance: ProjectState;
  //? attaching listeners and calling callback listener at data changes is
  //? subscribe pattern
  private listeners: Listener[] = [];
  private projects: Project[] = [];

  private constructor() {}

  get getProjects() {
    return this.projects;
  }

  //? checking and return the same instance is
  //? singleton pattern
  public static getInstance() {
    if (this.instance) {
      return this.instance;
    } else {
      this.instance = new ProjectState();
      return this.instance;
    }
  }

  public addListener(listener: Listener) {
    this.listeners.push(listener);
  }

  public addProject(title: string, desc: string, numberOfPeople: number) {
    const newProject = new Project(
      Math.random().toString(),
      title,
      desc,
      numberOfPeople,
      ProjectStatus.Active
    );
    this.projects.push(newProject);

    //? subscribing the listener
    for (const listener of this.listeners) {
      listener(this.projects.slice());
    }
  }
}

const projectState = ProjectState.getInstance();

//? method decorator
function BindToClass(
  _: any,
  _2: string | symbol,
  descriptor: PropertyDescriptor
) {
  const originalFunc = descriptor.value;
  const adjustFun: PropertyDescriptor = {
    configurable: true,
    get() {
      const boundFn = originalFunc.bind(this);
      return boundFn;
    },
  };

  return adjustFun;
}

class ProjectList {
  templateElement: HTMLTemplateElement;
  containerElement: HTMLDivElement;
  element: HTMLElement;
  assignedProjects: Project[];

  constructor(private type: "active" | "finished") {
    this.templateElement = document.getElementById(
      "project-list"
    )! as HTMLTemplateElement;
    this.containerElement = document.getElementById("app")! as HTMLDivElement;
    this.assignedProjects = [];

    const importedElement = document.importNode(
      this.templateElement.content,
      true
    );

    //* Section element
    this.element = importedElement.firstElementChild as HTMLElement;
    this.element.id = `${this.type}-projects`;

    projectState.addListener((projects: Project[]) => {
      this.assignedProjects = projects;

      //* clear previous li nodes
      document.querySelector(`#${this.type}-projects-list`)!.innerHTML = "";

      for (const projectItem of this.assignedProjects) {
        const listItem = document.createElement("li");
        listItem.textContent = projectItem.title;
        document
          .querySelector(`#${this.type}-projects-list`)!
          .appendChild(listItem);
      }
    });

    this.renderContent();
    this.attachList();
  }

  private renderContent() {
    this.element.querySelector("ul")!.id = `${this.type}-projects-list`;
    this.element.querySelector("h2")!.textContent = (
      this.type + " projects"
    ).toUpperCase();
  }

  private attachList() {
    this.containerElement.insertAdjacentElement("beforeend", this.element);
  }
}

class ProjectInput {
  templateElement: HTMLTemplateElement;
  containerElement: HTMLDivElement;
  formElement: HTMLFormElement;

  titleInputElement: HTMLInputElement;
  descriptionInputElement: HTMLInputElement;
  peopleInputElement: HTMLInputElement;

  constructor() {
    this.templateElement = document.getElementById(
      "project-input"
    )! as HTMLTemplateElement;
    this.containerElement = document.getElementById("app")! as HTMLDivElement;

    const importedElement = document.importNode(
      this.templateElement.content,
      true
    );

    //* Form element
    this.formElement = importedElement.firstElementChild as HTMLFormElement;

    this.titleInputElement = this.formElement.querySelector(
      "#title"
    )! as HTMLInputElement;
    this.descriptionInputElement = this.formElement.querySelector(
      "#description"
    )! as HTMLInputElement;
    this.peopleInputElement = this.formElement.querySelector(
      "#people"
    )! as HTMLInputElement;

    //? attatch event listener to form
    this.configureForm();
    //? add and id to form
    this.formElement.id = "user-input";
    //? append form to container div
    this.attachForm();
  }

  private attachForm() {
    this.containerElement.insertAdjacentElement("afterbegin", this.formElement);
  }

  //? fetch and validate form input
  private gatherInputs(): [string, string, number] | void {
    const titleInput = this.titleInputElement.value;
    const descriptionInput = this.descriptionInputElement.value;
    const peopleInput = this.peopleInputElement.value;

    const validatableTitle: Validatable = {
      value: titleInput,
      require: true,
    };
    const validatableDescription: Validatable = {
      value: descriptionInput,
      require: true,
      minLength: 5,
    };
    const validatablePeople: Validatable = {
      value: +peopleInput,
      require: true,
      min: 1,
      max: 6,
    };

    if (
      !validate(validatableTitle) ||
      !validate(validatableDescription) ||
      !validate(validatablePeople)
    ) {
      alert("Invalid Inputs");
      return;
    } else {
      return [titleInput, descriptionInput, +peopleInput];
    }
  }

  private clearInputs() {
    this.titleInputElement.value = "";
    this.descriptionInputElement.value = "";
    this.peopleInputElement.value = "";
  }

  @BindToClass
  private handleSubmit(e: Event) {
    e.preventDefault();
    const userInputs = this.gatherInputs();
    if (Array.isArray(userInputs)) {
      const [title, desc, people] = userInputs;
      projectState.addProject(title, desc, people);
      this.clearInputs();
    }
  }

  private configureForm() {
    this.formElement.addEventListener("submit", this.handleSubmit);
  }
}

const projectForm = new ProjectInput();
const projectActive = new ProjectList("active");
const projectFinish = new ProjectList("finished");
